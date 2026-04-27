use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

const MIGRATION: &str = include_str!("../migrations/0001_init.sql");

#[derive(Debug, Error)]
pub enum SpacesError {
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("record not found: {0}")]
    NotFound(String),
}

pub type Result<T> = std::result::Result<T, SpacesError>;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AttentionMode {
    Open,
    Focus,
    Recovery,
    Mirror,
}

impl AttentionMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            AttentionMode::Open => "open",
            AttentionMode::Focus => "focus",
            AttentionMode::Recovery => "recovery",
            AttentionMode::Mirror => "mirror",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "focus" => AttentionMode::Focus,
            "recovery" => AttentionMode::Recovery,
            "mirror" => AttentionMode::Mirror,
            _ => AttentionMode::Open,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intent {
    pub id: String,
    pub description: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Space {
    pub id: String,
    pub intent_id: String,
    pub attention_mode: AttentionMode,
    pub is_ephemeral: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceSummary {
    pub id: String,
    pub description: String,
    pub attention_mode: AttentionMode,
    pub is_ephemeral: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flow {
    pub id: String,
    pub space_id: String,
    pub order_index: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Module {
    pub id: String,
    pub flow_id: String,
    pub component_type: String,
    pub props_json: String,
}

pub struct Db {
    conn: Connection,
}

impl Db {
    pub fn open(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch(MIGRATION)?;
        Ok(Self { conn })
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(MIGRATION)?;
        Ok(Self { conn })
    }

    pub fn create_intent(&self, description: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        self.conn.execute(
            "INSERT INTO intents (id, description, created_at) VALUES (?1, ?2, ?3)",
            params![id, description, now],
        )?;
        Ok(id)
    }

    pub fn create_space(
        &self,
        intent_id: &str,
        mode: AttentionMode,
        is_ephemeral: bool,
    ) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO spaces (id, intent_id, attention_mode, is_ephemeral) VALUES (?1, ?2, ?3, ?4)",
            params![id, intent_id, mode.as_str(), is_ephemeral as i64],
        )?;
        Ok(id)
    }

    pub fn add_flow(&self, space_id: &str, order_index: i64) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO flows (id, space_id, order_index) VALUES (?1, ?2, ?3)",
            params![id, space_id, order_index],
        )?;
        Ok(id)
    }

    pub fn add_module(
        &self,
        flow_id: &str,
        component_type: &str,
        props_json: &str,
    ) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO modules (id, flow_id, component_type, props_json) VALUES (?1, ?2, ?3, ?4)",
            params![id, flow_id, component_type, props_json],
        )?;
        Ok(id)
    }

    pub fn list_spaces(&self) -> Result<Vec<SpaceSummary>> {
        let mut stmt = self.conn.prepare(
            "SELECT s.id, i.description, s.attention_mode, s.is_ephemeral
             FROM spaces s JOIN intents i ON s.intent_id = i.id
             ORDER BY s.rowid DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(SpaceSummary {
                id: row.get(0)?,
                description: row.get(1)?,
                attention_mode: AttentionMode::from_str(&row.get::<_, String>(2)?),
                is_ephemeral: row.get::<_, i64>(3)? != 0,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    pub fn get_space(&self, id: &str) -> Result<Space> {
        self.conn
            .query_row(
                "SELECT id, intent_id, attention_mode, is_ephemeral FROM spaces WHERE id = ?1",
                params![id],
                |row| {
                    Ok(Space {
                        id: row.get(0)?,
                        intent_id: row.get(1)?,
                        attention_mode: AttentionMode::from_str(&row.get::<_, String>(2)?),
                        is_ephemeral: row.get::<_, i64>(3)? != 0,
                    })
                },
            )
            .map_err(|_| SpacesError::NotFound(id.to_string()))
    }

    pub fn update_space_mode(&self, id: &str, mode: AttentionMode) -> Result<()> {
        let n = self.conn.execute(
            "UPDATE spaces SET attention_mode = ?1 WHERE id = ?2",
            params![mode.as_str(), id],
        )?;
        if n == 0 {
            return Err(SpacesError::NotFound(id.to_string()));
        }
        Ok(())
    }

    pub fn list_flows(&self, space_id: &str) -> Result<Vec<Flow>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, space_id, order_index FROM flows \
             WHERE space_id = ?1 ORDER BY order_index",
        )?;
        let rows = stmt.query_map(params![space_id], |row| {
            Ok(Flow {
                id: row.get(0)?,
                space_id: row.get(1)?,
                order_index: row.get(2)?,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(SpacesError::Db)
    }

    pub fn list_modules(&self, flow_id: &str) -> Result<Vec<Module>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, flow_id, component_type, props_json FROM modules \
             WHERE flow_id = ?1",
        )?;
        let rows = stmt.query_map(params![flow_id], |row| {
            Ok(Module {
                id: row.get(0)?,
                flow_id: row.get(1)?,
                component_type: row.get(2)?,
                props_json: row.get(3)?,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>()
            .map_err(SpacesError::Db)
    }

    pub fn delete_ephemeral_space(&self, id: &str) -> Result<()> {
        self.conn.execute(
            "DELETE FROM spaces WHERE id = ?1 AND is_ephemeral = 1",
            params![id],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn db() -> Db {
        Db::open_in_memory().unwrap()
    }

    #[test]
    fn create_intent_and_space() {
        let db = db();
        let intent_id = db.create_intent("deep work").unwrap();
        let space_id = db.create_space(&intent_id, AttentionMode::Focus, false).unwrap();
        let space = db.get_space(&space_id).unwrap();
        assert_eq!(space.attention_mode, AttentionMode::Focus);
        assert!(!space.is_ephemeral);
    }

    #[test]
    fn list_spaces_joins_intent_description() {
        let db = db();
        let iid = db.create_intent("recovery session").unwrap();
        db.create_space(&iid, AttentionMode::Recovery, false).unwrap();
        let spaces = db.list_spaces().unwrap();
        assert_eq!(spaces[0].description, "recovery session");
    }

    #[test]
    fn update_space_mode() {
        let db = db();
        let iid = db.create_intent("test").unwrap();
        let sid = db.create_space(&iid, AttentionMode::Open, false).unwrap();
        db.update_space_mode(&sid, AttentionMode::Focus).unwrap();
        let s = db.get_space(&sid).unwrap();
        assert_eq!(s.attention_mode, AttentionMode::Focus);
    }

    #[test]
    fn add_flow_and_module() {
        let db = db();
        let iid = db.create_intent("test").unwrap();
        let sid = db.create_space(&iid, AttentionMode::Open, false).unwrap();
        let fid = db.add_flow(&sid, 0).unwrap();
        let mid = db.add_module(&fid, "NoteModule", "{}").unwrap();
        assert!(!mid.is_empty());
    }

    #[test]
    fn ephemeral_space_deletion() {
        let db = db();
        let iid = db.create_intent("temp").unwrap();
        let sid = db.create_space(&iid, AttentionMode::Open, true).unwrap();
        db.delete_ephemeral_space(&sid).unwrap();
        assert!(db.get_space(&sid).is_err());
    }

    #[test]
    fn wrong_key_returns_not_found() {
        let db = db();
        let err = db.get_space("nonexistent").unwrap_err();
        assert!(matches!(err, SpacesError::NotFound(_)));
    }
}
