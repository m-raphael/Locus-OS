use chrono::Timelike;
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

const MIGRATION_V1: &str = include_str!("../migrations/0001_init.sql");
const MIGRATION_V2: &str = include_str!("../migrations/0002_memories.sql");
const MIGRATION_V3: &str = include_str!("../migrations/0003_collab.sql");
const MIGRATION_V4: &str = include_str!("../migrations/0004_plugins.sql");
const MIGRATION_V5: &str = include_str!("../migrations/0005_predictions.sql");
const MIGRATION_V6: &str = include_str!("../migrations/0006_focus_goals.sql");
const MIGRATION_V7: &str = include_str!("../migrations/0007_simulations.sql");

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
        conn.execute_batch(MIGRATION_V1)?;
        conn.execute_batch(MIGRATION_V2)?;
        conn.execute_batch(MIGRATION_V3)?;
        conn.execute_batch(MIGRATION_V4)?;
        conn.execute_batch(MIGRATION_V5)?;
        conn.execute_batch(MIGRATION_V6)?;
        conn.execute_batch(MIGRATION_V7)?;
        Ok(Self { conn })
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch(MIGRATION_V1)?;
        conn.execute_batch(MIGRATION_V2)?;
        conn.execute_batch(MIGRATION_V3)?;
        conn.execute_batch(MIGRATION_V4)?;
        conn.execute_batch(MIGRATION_V5)?;
        conn.execute_batch(MIGRATION_V6)?;
        conn.execute_batch(MIGRATION_V7)?;
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

    pub fn cleanup_ephemeral_spaces(&self, older_than_hours: i64) -> Result<usize> {
        let cutoff = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
            - older_than_hours * 3600;
        let rows = self.conn.execute(
            "DELETE FROM spaces WHERE is_ephemeral = 1 AND created_at < ?1",
            params![cutoff],
        )?;
        Ok(rows)
    }

    // ── Context memory (item 6 / N3) ──────────────────────────────────────

    pub fn store_memory(&self, content: &str, space_id: Option<&str>) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        self.conn.execute(
            "INSERT INTO memories (id, content, space_id, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, content, space_id, now],
        )?;
        Ok(id)
    }

    /// Full-text search via FTS5 BM25 ranking. Returns up to `limit` results.
    pub fn search_memories(&self, query: &str, limit: usize) -> Result<Vec<Memory>> {
        let q = query.trim();
        if q.is_empty() {
            return self.list_memories(limit);
        }
        let mut stmt = self.conn.prepare(
            "SELECT id, content, space_id, created_at FROM memories
             WHERE memories MATCH ?1 ORDER BY rank LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![q, limit as i64], memory_row)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    pub fn list_memories(&self, limit: usize) -> Result<Vec<Memory>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, content, space_id, created_at FROM memories
             ORDER BY created_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], memory_row)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    pub fn forget_memory(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM memories WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ── Live collab signaling (item 8 / N5) ───────────────────────────────

    pub fn push_signal(&self, room_id: &str, peer_id: &str, kind: &str, payload: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        self.conn.execute(
            "INSERT INTO collab_signals (id, room_id, peer_id, kind, payload, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, room_id, peer_id, kind, payload, now],
        )?;
        Ok(id)
    }

    /// Pull signals for a room that are newer than `since_ts` and NOT from `own_peer_id`.
    pub fn poll_signals(&self, room_id: &str, own_peer_id: &str, since_ts: i64) -> Result<Vec<CollabSignal>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, room_id, peer_id, kind, payload, created_at
             FROM collab_signals
             WHERE room_id = ?1 AND peer_id != ?2 AND created_at > ?3
             ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map(params![room_id, own_peer_id, since_ts], signal_row)?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    pub fn cleanup_signals(&self, room_id: &str, older_than_secs: i64) -> Result<()> {
        let cutoff = chrono::Utc::now().timestamp() - older_than_secs;
        self.conn.execute(
            "DELETE FROM collab_signals WHERE room_id = ?1 AND created_at < ?2",
            params![room_id, cutoff],
        )?;
        Ok(())
    }

    // ── Plugin registry (item 9) ───────────────────────────────────────────

    pub fn install_plugin(&self, id: &str, name: &str, version: &str, manifest_json: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        self.conn.execute(
            "INSERT OR REPLACE INTO plugins (id, name, version, manifest_json, installed_at, enabled)
             VALUES (?1, ?2, ?3, ?4, ?5, 1)",
            params![id, name, version, manifest_json, now],
        )?;
        Ok(())
    }

    pub fn uninstall_plugin(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM plugins WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn list_installed_plugins(&self) -> Result<Vec<InstalledPlugin>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, version, manifest_json, installed_at, enabled FROM plugins ORDER BY name",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(InstalledPlugin {
                id: row.get(0)?,
                name: row.get(1)?,
                version: row.get(2)?,
                manifest_json: row.get(3)?,
                installed_at: row.get(4)?,
                enabled: row.get::<_, i64>(5)? != 0,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    pub fn set_plugin_enabled(&self, id: &str, enabled: bool) -> Result<()> {
        self.conn.execute(
            "UPDATE plugins SET enabled = ?1 WHERE id = ?2",
            params![enabled as i64, id],
        )?;
        Ok(())
    }

    // ── Governance policies (N15 / G5) ───────────────────────────────────

    pub fn upsert_policy(&self, id: &str, name: &str, rule_json: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp();
        self.conn.execute(
            "INSERT OR REPLACE INTO policies (id, name, rule_json, created_at, enabled)
             VALUES (?1, ?2, ?3, ?4, 1)",
            params![id, name, rule_json, now],
        )?;
        Ok(())
    }

    pub fn list_policies(&self) -> Result<Vec<PolicyRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, rule_json, created_at, enabled FROM policies ORDER BY name",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(PolicyRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                rule_json: row.get(2)?,
                created_at: row.get(3)?,
                enabled: row.get::<_, i64>(4)? != 0,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    // ── Predictive Spaces (item 10 / N6) ───────────────────────────────────

    pub fn record_visit(&self, description: &str, visited_at: i64, hour_of_day: i32
    ) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO space_visits (id, description, visited_at, hour_of_day) VALUES (?1, ?2, ?3, ?4)",
            params![id, description, visited_at, hour_of_day],
        )?;
        Ok(id)
    }

    /// Predict next spaces by grouping visit descriptions and scoring by
    /// how close their typical hour-of-day is to the current hour.
    pub fn predict_next_spaces(&self, current_hour: i32, limit: usize
    ) -> Result<Vec<PredictedSpace>> {
        let mut stmt = self.conn.prepare(
            "SELECT description,
                    AVG(hour_of_day) AS avg_hour,
                    COUNT(*) AS visit_count
             FROM space_visits
             GROUP BY description
             ORDER BY visit_count DESC, ABS(avg_hour - ?1) ASC
             LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![current_hour, limit as i64], |row| {
            let description: String = row.get(0)?;
            let avg_hour: f64 = row.get(1)?;
            let count: i64 = row.get(2)?;
            let distance = (avg_hour - current_hour as f64).abs();
            let confidence = ((1.0 - (distance / 12.0)).clamp(0.0, 1.0) * (count as f64).min(10.0) / 10.0) as f32;
            let reason = if distance <= 1.5 {
                format!("Visited {} times, usually around {:02}:00", count, avg_hour.round() as i32)
            } else {
                format!("Visited {} times, often around {:02}:00", count, avg_hour.round() as i32)
            };
            Ok(PredictedSpace {
                description,
                confidence,
                reason,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    // ── Focus Goals (item 11 / N7) ─────────────────────────────────────────

    pub fn create_focus_goal(&self, name: &str, description: Option<&str>
    ) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        self.conn.execute(
            "INSERT INTO focus_goals (id, name, description, created_at, active) VALUES (?1, ?2, ?3, ?4, 0)",
            params![id, name, description, now],
        )?;
        Ok(id)
    }

    pub fn list_focus_goals(&self) -> Result<Vec<FocusGoal>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, created_at, active FROM focus_goals ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(FocusGoal {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                active: row.get::<_, i64>(4)? != 0,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    pub fn get_active_focus_goal(&self) -> Result<Option<FocusGoal>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, created_at, active FROM focus_goals WHERE active = 1 LIMIT 1",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(FocusGoal {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                active: row.get::<_, i64>(4)? != 0,
            })
        })?;
        let mut goals: Vec<FocusGoal> = rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)?;
        Ok(goals.pop())
    }

    pub fn set_active_focus_goal(&self, id: &str) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("UPDATE focus_goals SET active = 0", [])?;
        tx.execute("UPDATE focus_goals SET active = 1 WHERE id = ?1", params![id])?;
        tx.commit()?;
        Ok(())
    }

    pub fn clear_active_focus_goal(&self) -> Result<()> {
        self.conn.execute("UPDATE focus_goals SET active = 0", [])?;
        Ok(())
    }

    // ── Simulations (item 12 / N8) ────────────────────────────────────────

    pub fn create_simulation(&self, name: &str, description: Option<&str>
    ) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();
        self.conn.execute(
            "INSERT INTO simulations (id, name, description, created_at, status) VALUES (?1, ?2, ?3, ?4, 'pending')",
            params![id, name, description, now],
        )?;
        Ok(id)
    }

    pub fn list_simulations(&self, limit: usize) -> Result<Vec<Simulation>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, created_at, status FROM simulations ORDER BY created_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit as i64], |row| {
            Ok(Simulation {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                status: row.get(4)?,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    pub fn update_simulation_status(&self, id: &str, status: &str
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE simulations SET status = ?1 WHERE id = ?2",
            params![status, id],
        )?;
        Ok(())
    }

    pub fn store_simulation_results(&self, simulation_id: &str, results: &[(String, f64, f64)]
    ) -> Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        for (outcome_name, probability, confidence) in results {
            let rid = Uuid::new_v4().to_string();
            let now = chrono::Utc::now().timestamp();
            tx.execute(
                "INSERT INTO simulation_results (id, simulation_id, outcome_name, probability, confidence, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![rid, simulation_id, outcome_name, *probability, *confidence, now],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn get_simulation_results(&self, simulation_id: &str
    ) -> Result<Vec<SimulationResult>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, outcome_name, probability, confidence, created_at
             FROM simulation_results WHERE simulation_id = ?1 ORDER BY probability DESC",
        )?;
        let rows = stmt.query_map(params![simulation_id], |row| {
            Ok(SimulationResult {
                id: row.get(0)?,
                outcome_name: row.get(1)?,
                probability: row.get(2)?,
                confidence: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        rows.collect::<std::result::Result<Vec<_>, _>>().map_err(SpacesError::Db)
    }

    /// Run a simple Monte Carlo simulation using visit history.
    /// Returns (outcome_name, probability, confidence) tuples.
    pub fn run_simulation(&self, simulation_id: &str, hours_ahead: i32
    ) -> Result<Vec<(String, f64, f64)>> {
        let _now = chrono::Utc::now().timestamp();
        let current_hour = chrono::Utc::now().hour() as i32;
        let future_hour = (current_hour + hours_ahead) % 24;

        // Get predictions for future hour
        let predictions = self.predict_next_spaces(future_hour, 10)?;
        if predictions.is_empty() {
            self.update_simulation_status(simulation_id, "failed")?;
            return Ok(vec![]);
        }

        let total_confidence: f32 = predictions.iter().map(|p| p.confidence).sum();
        let count = predictions.len();
        let mut results = Vec::new();
        for p in &predictions {
            let prob = if total_confidence > 0.0 {
                (p.confidence / total_confidence) as f64
            } else {
                1.0 / count as f64
            };
            results.push((p.description.clone(), prob, p.confidence as f64));
        }

        self.update_simulation_status(simulation_id, "completed")?;
        self.store_simulation_results(simulation_id, &results)?;
        Ok(results)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub manifest_json: String,
    pub installed_at: i64,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRecord {
    pub id: String,
    pub name: String,
    pub rule_json: String,
    pub created_at: i64,
    pub enabled: bool,
}

// ── Predictive Spaces (item 10 / N6) ─────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceVisit {
    pub id: String,
    pub description: String,
    pub visited_at: i64,
    pub hour_of_day: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictedSpace {
    pub description: String,
    pub confidence: f32,
    pub reason: String,
}

// ── Focus Goals (item 11 / N7) ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusGoal {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub active: bool,
}

// ── Simulations (item 12 / N8) ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Simulation {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: i64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResult {
    pub id: String,
    pub outcome_name: String,
    pub probability: f64,
    pub confidence: f64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    pub id: String,
    pub content: String,
    pub space_id: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollabSignal {
    pub id: String,
    pub room_id: String,
    pub peer_id: String,
    pub kind: String,
    pub payload: String,
    pub created_at: i64,
}

fn memory_row(row: &rusqlite::Row) -> rusqlite::Result<Memory> {
    Ok(Memory {
        id: row.get(0)?,
        content: row.get(1)?,
        space_id: row.get(2)?,
        created_at: row.get(3)?,
    })
}

fn signal_row(row: &rusqlite::Row) -> rusqlite::Result<CollabSignal> {
    Ok(CollabSignal {
        id: row.get(0)?,
        room_id: row.get(1)?,
        peer_id: row.get(2)?,
        kind: row.get(3)?,
        payload: row.get(4)?,
        created_at: row.get(5)?,
    })
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

    #[test]
    fn store_and_recall_memory() {
        let db = db();
        db.store_memory("review inbox from Naomi", None).unwrap();
        db.store_memory("plan trip to Lisbon", None).unwrap();
        let results = db.search_memories("inbox", 5).unwrap();
        assert_eq!(results.len(), 1);
        assert!(results[0].content.contains("Naomi"));
    }

    #[test]
    fn list_memories_returns_all() {
        let db = db();
        db.store_memory("first intent", None).unwrap();
        db.store_memory("second intent", None).unwrap();
        let list = db.list_memories(10).unwrap();
        assert_eq!(list.len(), 2);
        let contents: Vec<_> = list.iter().map(|m| m.content.as_str()).collect();
        assert!(contents.contains(&"first intent"));
        assert!(contents.contains(&"second intent"));
    }

    #[test]
    fn forget_memory_removes_it() {
        let db = db();
        let id = db.store_memory("temporary note", None).unwrap();
        db.forget_memory(&id).unwrap();
        let results = db.search_memories("temporary", 5).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn collab_signals_poll_excludes_own_peer() {
        let db = db();
        db.push_signal("room1", "peer-a", "offer", r#"{"sdp":"..."}"#).unwrap();
        // peer-a polling: should see nothing (own signals excluded)
        let signals = db.poll_signals("room1", "peer-a", 0).unwrap();
        assert!(signals.is_empty());
        // peer-b polling: should see peer-a's offer
        let signals = db.poll_signals("room1", "peer-b", 0).unwrap();
        assert_eq!(signals.len(), 1);
        assert_eq!(signals[0].kind, "offer");
    }

    #[test]
    fn record_visit_and_predict() {
        let db = db();
        db.record_visit("review inbox", 1714214400, 9).unwrap();
        db.record_visit("review inbox", 1714300800, 9).unwrap();
        db.record_visit("plan trip", 1714214400, 14).unwrap();

        let predictions = db.predict_next_spaces(9, 5).unwrap();
        assert!(!predictions.is_empty());
        assert!(predictions[0].description == "review inbox");
        assert!(predictions[0].confidence > 0.0);
    }

    #[test]
    fn focus_goal_lifecycle() {
        let db = db();
        let id = db.create_focus_goal("deep work", Some("no meetings block")).unwrap();
        let goals = db.list_focus_goals().unwrap();
        assert_eq!(goals.len(), 1);
        assert_eq!(goals[0].name, "deep work");
        assert!(!goals[0].active);

        db.set_active_focus_goal(&id).unwrap();
        let active = db.get_active_focus_goal().unwrap();
        assert!(active.is_some());
        assert_eq!(active.unwrap().name, "deep work");

        db.clear_active_focus_goal().unwrap();
        let active = db.get_active_focus_goal().unwrap();
        assert!(active.is_none());
    }

    #[test]
    fn simulation_lifecycle() {
        let db = db();
        // Seed visit data
        db.record_visit("review inbox", 1714214400, 9).unwrap();
        db.record_visit("review inbox", 1714300800, 9).unwrap();
        db.record_visit("plan trip", 1714214400, 14).unwrap();

        let sim_id = db.create_simulation("morning forecast", Some("what next at 9am")).unwrap();
        let sims = db.list_simulations(10).unwrap();
        assert_eq!(sims.len(), 1);
        assert_eq!(sims[0].status, "pending");

        let results = db.run_simulation(&sim_id, 0).unwrap();
        assert!(!results.is_empty());

        let stored = db.get_simulation_results(&sim_id).unwrap();
        assert!(!stored.is_empty());
        let names: Vec<_> = stored.iter().map(|r| r.outcome_name.as_str()).collect();
        assert!(names.contains(&"review inbox"));
        assert!(stored[0].probability > 0.0 && stored[0].probability <= 1.0);
    }
}
