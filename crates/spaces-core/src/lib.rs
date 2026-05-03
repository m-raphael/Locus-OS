pub mod graph;
pub use graph::GraphDb;

use neo4rs::{query, Graph};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;
use chrono::Timelike;

// ── Error ─────────────────────────────────────────────────────────────────

#[derive(Debug, Error)]
pub enum SpacesError {
    #[error("neo4j: {0}")]
    Graph(#[from] neo4rs::Error),
    #[error("deserialize: {0}")]
    De(String),
    #[error("not found: {0}")]
    NotFound(String),
}

pub type Result<T> = std::result::Result<T, SpacesError>;

// Row extraction helpers
fn de(row: &neo4rs::Row, k: &str) -> Result<String> {
    row.get::<String>(k).map_err(|e| SpacesError::De(e.to_string()))
}
fn de_i64(row: &neo4rs::Row, k: &str) -> Result<i64> {
    row.get::<i64>(k).map_err(|e| SpacesError::De(e.to_string()))
}
fn de_f64(row: &neo4rs::Row, k: &str) -> Result<f64> {
    row.get::<f64>(k).map_err(|e| SpacesError::De(e.to_string()))
}
fn de_bool(row: &neo4rs::Row, k: &str) -> Result<bool> {
    row.get::<bool>(k).map_err(|e| SpacesError::De(e.to_string()))
}
fn de_opt(row: &neo4rs::Row, k: &str) -> Option<String> {
    row.get::<String>(k).ok().filter(|s| !s.is_empty())
}

// ── Domain types ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AttentionMode { Open, Focus, Recovery, Mirror }

impl AttentionMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            AttentionMode::Open => "open", AttentionMode::Focus => "focus",
            AttentionMode::Recovery => "recovery", AttentionMode::Mirror => "mirror",
        }
    }
    pub fn from_str(s: &str) -> Self {
        match s {
            "focus" => AttentionMode::Focus, "recovery" => AttentionMode::Recovery,
            "mirror" => AttentionMode::Mirror, _ => AttentionMode::Open,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intent { pub id: String, pub description: String, pub created_at: i64 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Space {
    pub id: String, pub intent_id: String,
    pub attention_mode: AttentionMode, pub is_ephemeral: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceSummary {
    pub id: String, pub description: String,
    pub attention_mode: AttentionMode, pub is_ephemeral: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flow { pub id: String, pub space_id: String, pub order_index: i64 }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Module {
    pub id: String, pub flow_id: String,
    pub component_type: String, pub props_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    pub id: String, pub content: String,
    pub space_id: Option<String>, pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CollabSignal {
    pub id: String, pub room_id: String, pub peer_id: String,
    pub kind: String, pub payload: String, pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub id: String, pub name: String, pub version: String,
    pub manifest_json: String, pub installed_at: i64, pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRecord {
    pub id: String, pub name: String, pub rule_json: String,
    pub created_at: i64, pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceVisit {
    pub id: String, pub description: String,
    pub visited_at: i64, pub hour_of_day: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictedSpace { pub description: String, pub confidence: f32, pub reason: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusGoal {
    pub id: String, pub name: String, pub description: Option<String>,
    pub created_at: i64, pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Simulation {
    pub id: String, pub name: String, pub description: Option<String>,
    pub created_at: i64, pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationResult {
    pub id: String, pub outcome_name: String,
    pub probability: f64, pub confidence: f64, pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String, pub event_type: String,
    pub actor: Option<String>, pub resource_id: Option<String>,
    pub details: Option<String>, pub created_at: i64,
}

// ── Db (Neo4j-backed) ─────────────────────────────────────────────────────

#[derive(Clone)]
pub struct Db(pub Graph);

impl Db {
    pub async fn connect(uri: &str, user: &str, password: &str) -> Result<Self> {
        let g = Graph::new(uri, user, password).await?;
        for q in [
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Intent) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Space) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Flow) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Module) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Memory) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Plugin) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:FocusGoal) REQUIRE n.id IS UNIQUE",
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Simulation) REQUIRE n.id IS UNIQUE",
        ] { g.run(neo4rs::query(q)).await.ok(); }
        Ok(Self(g))
    }

    pub async fn cleanup_ephemeral_spaces(&self, older_than_hours: i64) -> Result<usize> {
        let cutoff = chrono::Utc::now().timestamp() - older_than_hours * 3600;
        let mut r = self.0.execute(
            query("MATCH (s:Space {is_ephemeral: true}) WHERE s.created_at < $c \
                   WITH s DETACH DELETE s RETURN count(*) AS n")
                .param("c", cutoff),
        ).await?;
        if let Ok(Some(row)) = r.next().await { Ok(de_i64(&row, "n").unwrap_or(0) as usize) }
        else { Ok(0) }
    }

    // ── Intents ───────────────────────────────────────────────────────────

    pub async fn create_intent(&self, description: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let ts = chrono::Utc::now().timestamp();
        self.0.run(
            query("CREATE (:Intent {id:$id, description:$d, created_at:$ts})")
                .param("id", id.clone()).param("d", description).param("ts", ts),
        ).await?;
        Ok(id)
    }

    // ── Spaces ────────────────────────────────────────────────────────────

    pub async fn create_space(&self, intent_id: &str, mode: AttentionMode, is_ephemeral: bool) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let ts = chrono::Utc::now().timestamp();
        self.0.run(
            query("MATCH (i:Intent {id:$iid}) \
                   CREATE (s:Space {id:$id, intent_id:$iid, attention_mode:$m, is_ephemeral:$e, created_at:$ts})\
                   -[:FOR_INTENT]->(i)")
                .param("iid", intent_id).param("id", id.clone())
                .param("m", mode.as_str()).param("e", is_ephemeral).param("ts", ts),
        ).await?;
        Ok(id)
    }

    pub async fn list_spaces(&self) -> Result<Vec<SpaceSummary>> {
        let mut r = self.0.execute(
            query("MATCH (s:Space)-[:FOR_INTENT]->(i:Intent) \
                   RETURN s.id AS id, i.description AS desc, s.attention_mode AS mode, s.is_ephemeral AS eph \
                   ORDER BY s.created_at DESC"),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(SpaceSummary {
                id: de(&row, "id")?, description: de(&row, "desc")?,
                attention_mode: AttentionMode::from_str(&de(&row, "mode")?),
                is_ephemeral: de_bool(&row, "eph")?,
            });
        }
        Ok(out)
    }

    pub async fn get_space(&self, id: &str) -> Result<Space> {
        let mut r = self.0.execute(
            query("MATCH (s:Space {id:$id}) \
                   RETURN s.id AS id, s.intent_id AS iid, s.attention_mode AS mode, s.is_ephemeral AS eph")
                .param("id", id),
        ).await?;
        if let Ok(Some(row)) = r.next().await {
            Ok(Space {
                id: de(&row, "id")?, intent_id: de(&row, "iid")?,
                attention_mode: AttentionMode::from_str(&de(&row, "mode")?),
                is_ephemeral: de_bool(&row, "eph")?,
            })
        } else {
            Err(SpacesError::NotFound(id.to_string()))
        }
    }

    pub async fn update_space_mode(&self, id: &str, mode: AttentionMode) -> Result<()> {
        let mut r = self.0.execute(
            query("MATCH (s:Space {id:$id}) SET s.attention_mode=$m RETURN count(*) AS n")
                .param("id", id).param("m", mode.as_str()),
        ).await?;
        if let Ok(Some(row)) = r.next().await {
            if de_i64(&row, "n")? == 0 { return Err(SpacesError::NotFound(id.to_string())); }
        }
        Ok(())
    }

    pub async fn delete_ephemeral_space(&self, id: &str) -> Result<()> {
        self.0.run(
            query("MATCH (s:Space {id:$id, is_ephemeral:true}) DETACH DELETE s").param("id", id),
        ).await?;
        Ok(())
    }

    // ── Flows ─────────────────────────────────────────────────────────────

    pub async fn add_flow(&self, space_id: &str, order_index: i64) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        self.0.run(
            query("MATCH (s:Space {id:$sid}) \
                   CREATE (f:Flow {id:$id, space_id:$sid, order_index:$oi})<-[:HAS_FLOW]-(s)")
                .param("sid", space_id).param("id", id.clone()).param("oi", order_index),
        ).await?;
        Ok(id)
    }

    pub async fn list_flows(&self, space_id: &str) -> Result<Vec<Flow>> {
        let mut r = self.0.execute(
            query("MATCH (s:Space {id:$sid})-[:HAS_FLOW]->(f:Flow) \
                   RETURN f.id AS id, f.space_id AS sid, f.order_index AS oi ORDER BY f.order_index")
                .param("sid", space_id),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(Flow { id: de(&row,"id")?, space_id: de(&row,"sid")?, order_index: de_i64(&row,"oi")? });
        }
        Ok(out)
    }

    // ── Modules ───────────────────────────────────────────────────────────

    pub async fn add_module(&self, flow_id: &str, component_type: &str, props_json: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        self.0.run(
            query("MATCH (f:Flow {id:$fid}) \
                   CREATE (m:Module {id:$id, flow_id:$fid, component_type:$ct, props_json:$pj})<-[:HAS_MODULE]-(f)")
                .param("fid", flow_id).param("id", id.clone())
                .param("ct", component_type).param("pj", props_json),
        ).await?;
        Ok(id)
    }

    pub async fn list_modules(&self, flow_id: &str) -> Result<Vec<Module>> {
        let mut r = self.0.execute(
            query("MATCH (f:Flow {id:$fid})-[:HAS_MODULE]->(m:Module) \
                   RETURN m.id AS id, m.flow_id AS fid, m.component_type AS ct, m.props_json AS pj")
                .param("fid", flow_id),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(Module { id: de(&row,"id")?, flow_id: de(&row,"fid")?, component_type: de(&row,"ct")?, props_json: de(&row,"pj")? });
        }
        Ok(out)
    }

    // ── Memory ────────────────────────────────────────────────────────────

    pub async fn store_memory(&self, content: &str, space_id: Option<&str>) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let ts = chrono::Utc::now().timestamp();
        let sid = space_id.unwrap_or("");
        self.0.run(
            query("CREATE (:Memory {id:$id, content:$c, space_id:$sid, created_at:$ts})")
                .param("id", id.clone()).param("c", content).param("sid", sid).param("ts", ts),
        ).await?;
        Ok(id)
    }

    pub async fn list_memories(&self, limit: usize) -> Result<Vec<Memory>> {
        let mut r = self.0.execute(
            query("MATCH (m:Memory) \
                   RETURN m.id AS id, m.content AS c, m.space_id AS sid, m.created_at AS ts \
                   ORDER BY m.created_at DESC LIMIT $l")
                .param("l", limit as i64),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(Memory { id: de(&row,"id")?, content: de(&row,"c")?, space_id: de_opt(&row,"sid"), created_at: de_i64(&row,"ts")? });
        }
        Ok(out)
    }

    pub async fn search_memories(&self, query_str: &str, limit: usize) -> Result<Vec<Memory>> {
        let q = query_str.trim();
        if q.is_empty() { return self.list_memories(limit).await; }
        let mut r = self.0.execute(
            query("MATCH (m:Memory) WHERE toLower(m.content) CONTAINS toLower($q) \
                   RETURN m.id AS id, m.content AS c, m.space_id AS sid, m.created_at AS ts \
                   ORDER BY m.created_at DESC LIMIT $l")
                .param("q", q).param("l", limit as i64),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(Memory { id: de(&row,"id")?, content: de(&row,"c")?, space_id: de_opt(&row,"sid"), created_at: de_i64(&row,"ts")? });
        }
        Ok(out)
    }

    pub async fn forget_memory(&self, id: &str) -> Result<()> {
        self.0.run(query("MATCH (m:Memory {id:$id}) DETACH DELETE m").param("id", id)).await?;
        Ok(())
    }

    // ── Collab signals ────────────────────────────────────────────────────

    pub async fn push_signal(&self, room_id: &str, peer_id: &str, kind: &str, payload: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let ts = chrono::Utc::now().timestamp();
        self.0.run(
            query("CREATE (:Signal {id:$id, room_id:$room, peer_id:$peer, kind:$kind, payload:$payload, created_at:$ts})")
                .param("id", id.clone()).param("room", room_id).param("peer", peer_id)
                .param("kind", kind).param("payload", payload).param("ts", ts),
        ).await?;
        Ok(id)
    }

    pub async fn poll_signals(&self, room_id: &str, own_peer_id: &str, since_ts: i64) -> Result<Vec<CollabSignal>> {
        let mut r = self.0.execute(
            query("MATCH (s:Signal {room_id:$room}) WHERE s.peer_id <> $peer AND s.created_at > $ts \
                   RETURN s.id AS id, s.room_id AS room, s.peer_id AS peer, s.kind AS kind, s.payload AS payload, s.created_at AS ts \
                   ORDER BY s.created_at ASC")
                .param("room", room_id).param("peer", own_peer_id).param("ts", since_ts),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(CollabSignal {
                id: de(&row,"id")?, room_id: de(&row,"room")?, peer_id: de(&row,"peer")?,
                kind: de(&row,"kind")?, payload: de(&row,"payload")?, created_at: de_i64(&row,"ts")?,
            });
        }
        Ok(out)
    }

    pub async fn cleanup_signals(&self, room_id: &str, older_than_secs: i64) -> Result<()> {
        let cutoff = chrono::Utc::now().timestamp() - older_than_secs;
        self.0.run(
            query("MATCH (s:Signal {room_id:$room}) WHERE s.created_at < $c DETACH DELETE s")
                .param("room", room_id).param("c", cutoff),
        ).await?;
        Ok(())
    }

    // ── Plugins ───────────────────────────────────────────────────────────

    pub async fn install_plugin(&self, id: &str, name: &str, version: &str, manifest_json: &str) -> Result<()> {
        let ts = chrono::Utc::now().timestamp();
        self.0.run(
            query("MERGE (p:Plugin {id:$id}) SET p.name=$name, p.version=$ver, p.manifest_json=$mj, p.installed_at=$ts, p.enabled=true")
                .param("id", id).param("name", name).param("ver", version)
                .param("mj", manifest_json).param("ts", ts),
        ).await?;
        Ok(())
    }

    pub async fn uninstall_plugin(&self, id: &str) -> Result<()> {
        self.0.run(query("MATCH (p:Plugin {id:$id}) DETACH DELETE p").param("id", id)).await?;
        Ok(())
    }

    pub async fn list_installed_plugins(&self) -> Result<Vec<InstalledPlugin>> {
        let mut r = self.0.execute(
            query("MATCH (p:Plugin) RETURN p.id AS id, p.name AS name, p.version AS ver, p.manifest_json AS mj, p.installed_at AS ts, p.enabled AS enabled ORDER BY p.name"),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(InstalledPlugin {
                id: de(&row,"id")?, name: de(&row,"name")?, version: de(&row,"ver")?,
                manifest_json: de(&row,"mj")?, installed_at: de_i64(&row,"ts")?, enabled: de_bool(&row,"enabled")?,
            });
        }
        Ok(out)
    }

    pub async fn set_plugin_enabled(&self, id: &str, enabled: bool) -> Result<()> {
        self.0.run(
            query("MATCH (p:Plugin {id:$id}) SET p.enabled=$e").param("id", id).param("e", enabled),
        ).await?;
        Ok(())
    }

    // ── Governance ────────────────────────────────────────────────────────

    pub async fn upsert_policy(&self, id: &str, name: &str, rule_json: &str) -> Result<()> {
        let ts = chrono::Utc::now().timestamp();
        self.0.run(
            query("MERGE (p:Policy {id:$id}) SET p.name=$name, p.rule_json=$rj, p.created_at=$ts, p.enabled=true")
                .param("id", id).param("name", name).param("rj", rule_json).param("ts", ts),
        ).await?;
        Ok(())
    }

    pub async fn list_policies(&self) -> Result<Vec<PolicyRecord>> {
        let mut r = self.0.execute(
            query("MATCH (p:Policy) RETURN p.id AS id, p.name AS name, p.rule_json AS rj, p.created_at AS ts, p.enabled AS enabled ORDER BY p.name"),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(PolicyRecord {
                id: de(&row,"id")?, name: de(&row,"name")?, rule_json: de(&row,"rj")?,
                created_at: de_i64(&row,"ts")?, enabled: de_bool(&row,"enabled")?,
            });
        }
        Ok(out)
    }

    // ── Predictive spaces ─────────────────────────────────────────────────

    pub async fn record_visit(&self, description: &str, visited_at: i64, hour_of_day: i32) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        self.0.run(
            query("CREATE (:Visit {id:$id, description:$d, visited_at:$vt, hour_of_day:$hod})")
                .param("id", id.clone()).param("d", description)
                .param("vt", visited_at).param("hod", hour_of_day as i64),
        ).await?;
        Ok(id)
    }

    pub async fn predict_next_spaces(&self, current_hour: i32, limit: usize) -> Result<Vec<PredictedSpace>> {
        let mut r = self.0.execute(
            query("MATCH (v:Visit) \
                   WITH v.description AS desc, avg(toFloat(v.hour_of_day)) AS avg_h, count(*) AS cnt \
                   ORDER BY cnt DESC, abs(avg_h - $hour) ASC LIMIT $l \
                   RETURN desc, avg_h, cnt")
                .param("hour", current_hour as i64).param("l", limit as i64),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            let description = de(&row, "desc")?;
            let avg_h = de_f64(&row, "avg_h")?;
            let count = de_i64(&row, "cnt")?;
            let distance = (avg_h - current_hour as f64).abs();
            let confidence = ((1.0 - (distance / 12.0)).clamp(0.0, 1.0) * (count as f64).min(10.0) / 10.0) as f32;
            let reason = if distance <= 1.5 {
                format!("Visited {} times, usually around {:02}:00", count, avg_h.round() as i32)
            } else {
                format!("Visited {} times, often around {:02}:00", count, avg_h.round() as i32)
            };
            out.push(PredictedSpace { description, confidence, reason });
        }
        Ok(out)
    }

    // ── Focus goals ───────────────────────────────────────────────────────

    pub async fn create_focus_goal(&self, name: &str, description: Option<&str>) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let ts = chrono::Utc::now().timestamp();
        let desc = description.unwrap_or("");
        self.0.run(
            query("CREATE (:FocusGoal {id:$id, name:$name, description:$desc, created_at:$ts, active:false})")
                .param("id", id.clone()).param("name", name).param("desc", desc).param("ts", ts),
        ).await?;
        Ok(id)
    }

    pub async fn list_focus_goals(&self) -> Result<Vec<FocusGoal>> {
        let mut r = self.0.execute(
            query("MATCH (g:FocusGoal) RETURN g.id AS id, g.name AS name, g.description AS desc, g.created_at AS ts, g.active AS active ORDER BY g.created_at DESC"),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(FocusGoal {
                id: de(&row,"id")?, name: de(&row,"name")?,
                description: de_opt(&row,"desc"), created_at: de_i64(&row,"ts")?,
                active: de_bool(&row,"active")?,
            });
        }
        Ok(out)
    }

    pub async fn get_active_focus_goal(&self) -> Result<Option<FocusGoal>> {
        let mut r = self.0.execute(
            query("MATCH (g:FocusGoal {active:true}) RETURN g.id AS id, g.name AS name, g.description AS desc, g.created_at AS ts LIMIT 1"),
        ).await?;
        if let Ok(Some(row)) = r.next().await {
            Ok(Some(FocusGoal {
                id: de(&row,"id")?, name: de(&row,"name")?,
                description: de_opt(&row,"desc"), created_at: de_i64(&row,"ts")?, active: true,
            }))
        } else { Ok(None) }
    }

    pub async fn set_active_focus_goal(&self, id: &str) -> Result<()> {
        self.0.run(query("MATCH (g:FocusGoal) SET g.active=false")).await?;
        self.0.run(query("MATCH (g:FocusGoal {id:$id}) SET g.active=true").param("id", id)).await?;
        Ok(())
    }

    pub async fn clear_active_focus_goal(&self) -> Result<()> {
        self.0.run(query("MATCH (g:FocusGoal) SET g.active=false")).await?;
        Ok(())
    }

    // ── Simulations ───────────────────────────────────────────────────────

    pub async fn create_simulation(&self, name: &str, description: Option<&str>) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let ts = chrono::Utc::now().timestamp();
        let desc = description.unwrap_or("");
        self.0.run(
            query("CREATE (:Simulation {id:$id, name:$name, description:$desc, created_at:$ts, status:'pending'})")
                .param("id", id.clone()).param("name", name).param("desc", desc).param("ts", ts),
        ).await?;
        Ok(id)
    }

    pub async fn list_simulations(&self, limit: usize) -> Result<Vec<Simulation>> {
        let mut r = self.0.execute(
            query("MATCH (s:Simulation) RETURN s.id AS id, s.name AS name, s.description AS desc, s.created_at AS ts, s.status AS status ORDER BY s.created_at DESC LIMIT $l")
                .param("l", limit as i64),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(Simulation {
                id: de(&row,"id")?, name: de(&row,"name")?,
                description: de_opt(&row,"desc"), created_at: de_i64(&row,"ts")?,
                status: de(&row,"status")?,
            });
        }
        Ok(out)
    }

    pub async fn update_simulation_status(&self, id: &str, status: &str) -> Result<()> {
        self.0.run(
            query("MATCH (s:Simulation {id:$id}) SET s.status=$s").param("id", id).param("s", status),
        ).await?;
        Ok(())
    }

    pub async fn store_simulation_results(&self, simulation_id: &str, results: &[(String, f64, f64)]) -> Result<()> {
        let ts = chrono::Utc::now().timestamp();
        for (name, prob, conf) in results {
            let rid = Uuid::new_v4().to_string();
            self.0.run(
                query("MATCH (sim:Simulation {id:$sid}) \
                       CREATE (r:SimResult {id:$id, outcome_name:$name, probability:$prob, confidence:$conf, created_at:$ts})<-[:HAS_RESULT]-(sim)")
                    .param("sid", simulation_id).param("id", rid)
                    .param("name", name.clone()).param("prob", *prob).param("conf", *conf).param("ts", ts),
            ).await?;
        }
        Ok(())
    }

    pub async fn get_simulation_results(&self, simulation_id: &str) -> Result<Vec<SimulationResult>> {
        let mut r = self.0.execute(
            query("MATCH (sim:Simulation {id:$sid})-[:HAS_RESULT]->(r:SimResult) \
                   RETURN r.id AS id, r.outcome_name AS name, r.probability AS prob, r.confidence AS conf, r.created_at AS ts \
                   ORDER BY r.probability DESC")
                .param("sid", simulation_id),
        ).await?;
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(SimulationResult {
                id: de(&row,"id")?, outcome_name: de(&row,"name")?,
                probability: de_f64(&row,"prob")?, confidence: de_f64(&row,"conf")?,
                created_at: de_i64(&row,"ts")?,
            });
        }
        Ok(out)
    }

    pub async fn run_simulation(&self, simulation_id: &str, hours_ahead: i32) -> Result<Vec<(String, f64, f64)>> {
        let future_hour = (chrono::Utc::now().hour() as i32 + hours_ahead) % 24;
        let predictions = self.predict_next_spaces(future_hour, 10).await?;
        if predictions.is_empty() {
            self.update_simulation_status(simulation_id, "failed").await?;
            return Ok(vec![]);
        }
        let total: f32 = predictions.iter().map(|p| p.confidence).sum();
        let count = predictions.len();
        let results: Vec<(String, f64, f64)> = predictions.iter().map(|p| {
            let prob = if total > 0.0 { (p.confidence / total) as f64 } else { 1.0 / count as f64 };
            (p.description.clone(), prob, p.confidence as f64)
        }).collect();
        self.update_simulation_status(simulation_id, "completed").await?;
        self.store_simulation_results(simulation_id, &results).await?;
        Ok(results)
    }

    // ── Audit logs ────────────────────────────────────────────────────────

    pub async fn log_audit_event(&self, event_type: &str, actor: Option<&str>, resource_id: Option<&str>, details: Option<&str>) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let ts = chrono::Utc::now().timestamp();
        self.0.run(
            query("CREATE (:AuditLog {id:$id, event_type:$et, actor:$actor, resource_id:$rid, details:$det, created_at:$ts})")
                .param("id", id.clone()).param("et", event_type)
                .param("actor", actor.unwrap_or("")).param("rid", resource_id.unwrap_or(""))
                .param("det", details.unwrap_or("")).param("ts", ts),
        ).await?;
        Ok(id)
    }

    pub async fn list_audit_logs(&self, event_type: Option<&str>, limit: usize) -> Result<Vec<AuditLog>> {
        let mut r = if let Some(et) = event_type {
            self.0.execute(
                query("MATCH (a:AuditLog {event_type:$et}) \
                       RETURN a.id AS id, a.event_type AS et, a.actor AS actor, a.resource_id AS rid, a.details AS det, a.created_at AS ts \
                       ORDER BY a.created_at DESC LIMIT $l")
                    .param("et", et).param("l", limit as i64),
            ).await?
        } else {
            self.0.execute(
                query("MATCH (a:AuditLog) \
                       RETURN a.id AS id, a.event_type AS et, a.actor AS actor, a.resource_id AS rid, a.details AS det, a.created_at AS ts \
                       ORDER BY a.created_at DESC LIMIT $l")
                    .param("l", limit as i64),
            ).await?
        };
        let mut out = vec![];
        while let Ok(Some(row)) = r.next().await {
            out.push(AuditLog {
                id: de(&row,"id")?, event_type: de(&row,"et")?,
                actor: de_opt(&row,"actor"), resource_id: de_opt(&row,"rid"),
                details: de_opt(&row,"det"), created_at: de_i64(&row,"ts")?,
            });
        }
        Ok(out)
    }
}
