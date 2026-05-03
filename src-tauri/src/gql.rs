//! GraphQL schema layered over the Neo4j-backed spaces_core::Db.
//!
//! Mounted at POST /graphql by api::serve. GraphiQL playground lives at /graphiql.
//! All resolvers are async; the Db is Clone-cheap (neo4rs::Graph wraps an Arc).

use async_graphql::{Context, EmptySubscription, Error, Object, Result as GqlResult, Schema, SimpleObject};
use spaces_core::{Db, GraphDb};
use std::sync::Arc;

pub type LocusSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

pub struct GqlState {
    pub db: Db,
    pub graph: Option<GraphDb>,
    pub nlp: Arc<dyn locus_nlp::NlpPipeline>,
}

pub fn build_schema(db: Db, graph: Option<GraphDb>, nlp: Arc<dyn locus_nlp::NlpPipeline>) -> LocusSchema {
    let builder = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(GqlState { db, graph, nlp })
        // Bound query cost: prevents pathological nested traversals from
        // pinning the Neo4j daemon. Tune if legitimate queries hit the cap.
        .limit_depth(10)
        .limit_complexity(1000);

    // Hide the schema in release; debug builds keep introspection so the
    // GraphiQL playground works during development.
    #[cfg(not(debug_assertions))]
    let builder = builder.disable_introspection();

    builder.finish()
}

fn st<'a>(ctx: &'a Context<'_>) -> &'a GqlState { ctx.data_unchecked::<GqlState>() }

// ── GraphQL output objects ────────────────────────────────────────────────

#[derive(SimpleObject)]
pub struct Space {
    pub id: String,
    pub description: String,
    pub attention_mode: String,
    pub is_ephemeral: bool,
}
impl From<spaces_core::SpaceSummary> for Space {
    fn from(s: spaces_core::SpaceSummary) -> Self {
        Self { id: s.id, description: s.description,
               attention_mode: s.attention_mode.as_str().to_string(),
               is_ephemeral: s.is_ephemeral }
    }
}

#[derive(SimpleObject)]
pub struct Flow { pub id: String, pub space_id: String, pub order_index: i64 }
impl From<spaces_core::Flow> for Flow {
    fn from(f: spaces_core::Flow) -> Self {
        Self { id: f.id, space_id: f.space_id, order_index: f.order_index }
    }
}

#[derive(SimpleObject)]
pub struct Module {
    pub id: String, pub flow_id: String,
    pub component_type: String, pub props_json: String,
}
impl From<spaces_core::Module> for Module {
    fn from(m: spaces_core::Module) -> Self {
        Self { id: m.id, flow_id: m.flow_id,
               component_type: m.component_type, props_json: m.props_json }
    }
}

#[derive(SimpleObject)]
pub struct Memory {
    pub id: String, pub content: String,
    pub space_id: Option<String>, pub created_at: i64,
}
impl From<spaces_core::Memory> for Memory {
    fn from(m: spaces_core::Memory) -> Self {
        Self { id: m.id, content: m.content, space_id: m.space_id, created_at: m.created_at }
    }
}

#[derive(SimpleObject)]
pub struct CollabSignal {
    pub id: String, pub room_id: String, pub peer_id: String,
    pub kind: String, pub payload: String, pub created_at: i64,
}
impl From<spaces_core::CollabSignal> for CollabSignal {
    fn from(s: spaces_core::CollabSignal) -> Self {
        Self { id: s.id, room_id: s.room_id, peer_id: s.peer_id,
               kind: s.kind, payload: s.payload, created_at: s.created_at }
    }
}

#[derive(SimpleObject)]
pub struct InstalledPlugin {
    pub id: String, pub name: String, pub version: String,
    pub manifest_json: String, pub installed_at: i64, pub enabled: bool,
}
impl From<spaces_core::InstalledPlugin> for InstalledPlugin {
    fn from(p: spaces_core::InstalledPlugin) -> Self {
        Self { id: p.id, name: p.name, version: p.version,
               manifest_json: p.manifest_json, installed_at: p.installed_at, enabled: p.enabled }
    }
}

#[derive(SimpleObject)]
pub struct PredictedSpace { pub description: String, pub confidence: f64, pub reason: String }
impl From<spaces_core::PredictedSpace> for PredictedSpace {
    fn from(p: spaces_core::PredictedSpace) -> Self {
        Self { description: p.description, confidence: p.confidence as f64, reason: p.reason }
    }
}

#[derive(SimpleObject)]
pub struct FocusGoal {
    pub id: String, pub name: String, pub description: Option<String>,
    pub created_at: i64, pub active: bool,
}
impl From<spaces_core::FocusGoal> for FocusGoal {
    fn from(g: spaces_core::FocusGoal) -> Self {
        Self { id: g.id, name: g.name, description: g.description,
               created_at: g.created_at, active: g.active }
    }
}

#[derive(SimpleObject)]
pub struct Simulation {
    pub id: String, pub name: String, pub description: Option<String>,
    pub created_at: i64, pub status: String,
}
impl From<spaces_core::Simulation> for Simulation {
    fn from(s: spaces_core::Simulation) -> Self {
        Self { id: s.id, name: s.name, description: s.description,
               created_at: s.created_at, status: s.status }
    }
}

#[derive(SimpleObject)]
pub struct SimulationResult {
    pub id: String, pub outcome_name: String,
    pub probability: f64, pub confidence: f64, pub created_at: i64,
}
impl From<spaces_core::SimulationResult> for SimulationResult {
    fn from(r: spaces_core::SimulationResult) -> Self {
        Self { id: r.id, outcome_name: r.outcome_name,
               probability: r.probability, confidence: r.confidence, created_at: r.created_at }
    }
}

#[derive(SimpleObject)]
pub struct AuditLog {
    pub id: String, pub event_type: String,
    pub actor: Option<String>, pub resource_id: Option<String>,
    pub details: Option<String>, pub created_at: i64,
}
impl From<spaces_core::AuditLog> for AuditLog {
    fn from(a: spaces_core::AuditLog) -> Self {
        Self { id: a.id, event_type: a.event_type, actor: a.actor,
               resource_id: a.resource_id, details: a.details, created_at: a.created_at }
    }
}

#[derive(SimpleObject)]
pub struct Plugin {
    pub id: String, pub name: String, pub version: String,
    pub manifest_json: String,
}

// ── NLP types ───────────────────────────────────────────────────────────────

#[derive(async_graphql::Enum, Clone, Copy, PartialEq, Eq)]
pub enum GqlPosTag {
    Noun, Verb, Adj, Adv, Pron, Det, Prep, Conj, Num, Punct, Other,
}
impl From<locus_nlp::PosTag> for GqlPosTag {
    fn from(p: locus_nlp::PosTag) -> Self {
        match p {
            locus_nlp::PosTag::Noun => Self::Noun,
            locus_nlp::PosTag::Verb => Self::Verb,
            locus_nlp::PosTag::Adj => Self::Adj,
            locus_nlp::PosTag::Adv => Self::Adv,
            locus_nlp::PosTag::Pron => Self::Pron,
            locus_nlp::PosTag::Det => Self::Det,
            locus_nlp::PosTag::Prep => Self::Prep,
            locus_nlp::PosTag::Conj => Self::Conj,
            locus_nlp::PosTag::Num => Self::Num,
            locus_nlp::PosTag::Punct => Self::Punct,
            locus_nlp::PosTag::Other => Self::Other,
        }
    }
}

#[derive(async_graphql::Enum, Clone, Copy, PartialEq, Eq)]
pub enum GqlEntityLabel {
    Person, Org, Loc, Date, Time, Money, Product, Misc,
}
impl From<locus_nlp::EntityLabel> for GqlEntityLabel {
    fn from(e: locus_nlp::EntityLabel) -> Self {
        match e {
            locus_nlp::EntityLabel::Person => Self::Person,
            locus_nlp::EntityLabel::Org => Self::Org,
            locus_nlp::EntityLabel::Loc => Self::Loc,
            locus_nlp::EntityLabel::Date => Self::Date,
            locus_nlp::EntityLabel::Time => Self::Time,
            locus_nlp::EntityLabel::Money => Self::Money,
            locus_nlp::EntityLabel::Product => Self::Product,
            locus_nlp::EntityLabel::Misc => Self::Misc,
        }
    }
}

#[derive(SimpleObject)]
pub struct GqlToken {
    pub start: usize,
    pub end: usize,
    pub surface: String,
    pub lemma: Option<String>,
    pub pos: GqlPosTag,
}
impl From<locus_nlp::Token> for GqlToken {
    fn from(t: locus_nlp::Token) -> Self {
        Self { start: t.start, end: t.end, surface: t.surface, lemma: t.lemma, pos: t.pos.into() }
    }
}

#[derive(SimpleObject)]
pub struct GqlEntity {
    pub start: usize,
    pub end: usize,
    pub text: String,
    pub label: GqlEntityLabel,
    pub score: f64,
    pub linked_id: Option<String>,
}
impl From<locus_nlp::Entity> for GqlEntity {
    fn from(e: locus_nlp::Entity) -> Self {
        Self { start: e.start, end: e.end, text: e.text, label: e.label.into(),
               score: e.score as f64, linked_id: e.linked_id }
    }
}

#[derive(SimpleObject)]
pub struct GqlNlpDoc {
    pub text: String,
    pub tokens: Vec<GqlToken>,
    pub entities: Vec<GqlEntity>,
}
impl From<locus_nlp::NlpDoc> for GqlNlpDoc {
    fn from(d: locus_nlp::NlpDoc) -> Self {
        Self {
            text: d.text,
            tokens: d.tokens.into_iter().map(GqlToken::from).collect(),
            entities: d.entities.into_iter().map(GqlEntity::from).collect(),
        }
    }
}

// ── Query root ────────────────────────────────────────────────────────────

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Healthcheck — returns "ok" when the schema is reachable.
    async fn status(&self) -> &str { "ok" }

    async fn spaces(&self, ctx: &Context<'_>) -> GqlResult<Vec<Space>> {
        let s = st(ctx);
        Ok(s.db.list_spaces().await.map_err(to_gql)?
            .into_iter().map(Space::from).collect())
    }

    async fn flows(&self, ctx: &Context<'_>, space_id: String) -> GqlResult<Vec<Flow>> {
        Ok(st(ctx).db.list_flows(&space_id).await.map_err(to_gql)?
            .into_iter().map(Flow::from).collect())
    }

    async fn modules(&self, ctx: &Context<'_>, flow_id: String) -> GqlResult<Vec<Module>> {
        Ok(st(ctx).db.list_modules(&flow_id).await.map_err(to_gql)?
            .into_iter().map(Module::from).collect())
    }

    async fn memories(&self, ctx: &Context<'_>, limit: Option<i32>) -> GqlResult<Vec<Memory>> {
        let n = limit.unwrap_or(12).max(1) as usize;
        Ok(st(ctx).db.list_memories(n).await.map_err(to_gql)?
            .into_iter().map(Memory::from).collect())
    }

    async fn search_memories(&self, ctx: &Context<'_>, query: String, limit: Option<i32>) -> GqlResult<Vec<Memory>> {
        let n = limit.unwrap_or(8).max(1) as usize;
        Ok(st(ctx).db.search_memories(&query, n).await.map_err(to_gql)?
            .into_iter().map(Memory::from).collect())
    }

    async fn poll_signals(&self, ctx: &Context<'_>, room_id: String, peer_id: String, since_ts: i64) -> GqlResult<Vec<CollabSignal>> {
        Ok(st(ctx).db.poll_signals(&room_id, &peer_id, since_ts).await.map_err(to_gql)?
            .into_iter().map(CollabSignal::from).collect())
    }

    async fn installed_plugins(&self, ctx: &Context<'_>) -> GqlResult<Vec<InstalledPlugin>> {
        Ok(st(ctx).db.list_installed_plugins().await.map_err(to_gql)?
            .into_iter().map(InstalledPlugin::from).collect())
    }

    async fn marketplace(&self) -> Vec<Plugin> {
        crate::marketplace::built_in_catalog().into_iter().map(|p| Plugin {
            id: p.id.clone(), name: p.name.clone(), version: p.version.clone(),
            manifest_json: serde_json::to_string(&p).unwrap_or_default(),
        }).collect()
    }

    async fn predict_next_spaces(&self, ctx: &Context<'_>, hour: i32, limit: Option<i32>) -> GqlResult<Vec<PredictedSpace>> {
        let n = limit.unwrap_or(5).max(1) as usize;
        Ok(st(ctx).db.predict_next_spaces(hour, n).await.map_err(to_gql)?
            .into_iter().map(PredictedSpace::from).collect())
    }

    async fn focus_goals(&self, ctx: &Context<'_>) -> GqlResult<Vec<FocusGoal>> {
        Ok(st(ctx).db.list_focus_goals().await.map_err(to_gql)?
            .into_iter().map(FocusGoal::from).collect())
    }

    async fn active_focus_goal(&self, ctx: &Context<'_>) -> GqlResult<Option<FocusGoal>> {
        Ok(st(ctx).db.get_active_focus_goal().await.map_err(to_gql)?.map(FocusGoal::from))
    }

    async fn simulations(&self, ctx: &Context<'_>, limit: Option<i32>) -> GqlResult<Vec<Simulation>> {
        let n = limit.unwrap_or(20).max(1) as usize;
        Ok(st(ctx).db.list_simulations(n).await.map_err(to_gql)?
            .into_iter().map(Simulation::from).collect())
    }

    async fn simulation_results(&self, ctx: &Context<'_>, id: String) -> GqlResult<Vec<SimulationResult>> {
        Ok(st(ctx).db.get_simulation_results(&id).await.map_err(to_gql)?
            .into_iter().map(SimulationResult::from).collect())
    }

    async fn audit_logs(&self, ctx: &Context<'_>, event_type: Option<String>, limit: Option<i32>) -> GqlResult<Vec<AuditLog>> {
        let n = limit.unwrap_or(50).max(1) as usize;
        Ok(st(ctx).db.list_audit_logs(event_type.as_deref(), n).await.map_err(to_gql)?
            .into_iter().map(AuditLog::from).collect())
    }

    /// Spaces reachable within 3 hops from the given space (Neo4j).
    async fn related_spaces(&self, ctx: &Context<'_>, space_id: String, limit: Option<i32>) -> Vec<String> {
        let n = limit.unwrap_or(5).max(1) as usize;
        match &st(ctx).graph {
            Some(g) => g.related_spaces(&space_id, n).await,
            None => vec![],
        }
    }

    /// Ordered space IDs along the shortest LEADS_TO path to a target attention mode.
    async fn attention_path(&self, ctx: &Context<'_>, space_id: String, mode: String) -> Vec<String> {
        match &st(ctx).graph {
            Some(g) => g.attention_path(&space_id, &mode).await,
            None => vec![],
        }
    }
}

// ── Mutation root ─────────────────────────────────────────────────────────

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    async fn create_space(&self, ctx: &Context<'_>, description: String, mode: String, ephemeral: bool) -> GqlResult<String> {
        let s = st(ctx);
        let intent_id = s.db.create_intent(&description).await.map_err(to_gql)?;
        let mode_enum = spaces_core::AttentionMode::from_str(&mode);
        let space_id = s.db.create_space(&intent_id, mode_enum, ephemeral).await.map_err(to_gql)?;
        // Audit log records structural metadata only — never the user-supplied description.
        let _ = s.db.log_audit_event("space_created", Some("locus_user"),
            Some(&space_id), Some(&format!("mode={mode} ephemeral={ephemeral} desc_len={}", description.len()))).await;
        Ok(space_id)
    }

    async fn set_space_mode(&self, ctx: &Context<'_>, space_id: String, mode: String) -> GqlResult<bool> {
        let s = st(ctx);
        s.db.update_space_mode(&space_id, spaces_core::AttentionMode::from_str(&mode)).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("mode_changed", Some("locus_user"), Some(&space_id), Some(&format!("mode={mode}"))).await;
        Ok(true)
    }

    async fn dismiss_space(&self, ctx: &Context<'_>, space_id: String) -> GqlResult<bool> {
        let s = st(ctx);
        s.db.delete_ephemeral_space(&space_id).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("space_dismissed", Some("locus_user"), Some(&space_id), None).await;
        Ok(true)
    }

    async fn create_flow(&self, ctx: &Context<'_>, space_id: String, order_index: i64) -> GqlResult<String> {
        st(ctx).db.add_flow(&space_id, order_index).await.map_err(to_gql)
    }

    async fn create_module(&self, ctx: &Context<'_>, flow_id: String, component_type: String, props_json: String) -> GqlResult<String> {
        st(ctx).db.add_module(&flow_id, &component_type, &props_json).await.map_err(to_gql)
    }

    async fn store_memory(&self, ctx: &Context<'_>, content: String, space_id: Option<String>) -> GqlResult<String> {
        let s = st(ctx);
        let id = s.db.store_memory(&content, space_id.as_deref()).await.map_err(to_gql)?;
        // Log length only — memory content stays in the Memory node.
        let _ = s.db.log_audit_event("memory_stored", Some("locus_user"), Some(&id), Some(&format!("len={}", content.len()))).await;
        Ok(id)
    }

    async fn forget_memory(&self, ctx: &Context<'_>, id: String) -> GqlResult<bool> {
        let s = st(ctx);
        s.db.forget_memory(&id).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("memory_forgotten", Some("locus_user"), Some(&id), None).await;
        Ok(true)
    }

    async fn push_signal(&self, ctx: &Context<'_>, room_id: String, peer_id: String, kind: String, payload: String) -> GqlResult<String> {
        st(ctx).db.push_signal(&room_id, &peer_id, &kind, &payload).await.map_err(to_gql)
    }

    async fn cleanup_signals(&self, ctx: &Context<'_>, room_id: String) -> GqlResult<bool> {
        st(ctx).db.cleanup_signals(&room_id, 300).await.map_err(to_gql)?;
        Ok(true)
    }

    async fn install_plugin(&self, ctx: &Context<'_>, id: String) -> GqlResult<bool> {
        let s = st(ctx);
        let catalog = crate::marketplace::built_in_catalog();
        let plugin = catalog.iter().find(|p| p.id == id)
            .ok_or_else(|| Error::new(format!("Plugin '{}' not found", id)))?;
        let manifest_json = serde_json::to_string(plugin).map_err(|e| Error::new(e.to_string()))?;
        s.db.install_plugin(&plugin.id, &plugin.name, &plugin.version, &manifest_json).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("plugin_installed", Some("locus_user"), Some(&id), Some(&plugin.name)).await;
        Ok(true)
    }

    async fn uninstall_plugin(&self, ctx: &Context<'_>, id: String) -> GqlResult<bool> {
        let s = st(ctx);
        s.db.uninstall_plugin(&id).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("plugin_uninstalled", Some("locus_user"), Some(&id), None).await;
        Ok(true)
    }

    async fn set_plugin_enabled(&self, ctx: &Context<'_>, id: String, enabled: bool) -> GqlResult<bool> {
        let s = st(ctx);
        s.db.set_plugin_enabled(&id, enabled).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("plugin_toggled", Some("locus_user"), Some(&id), Some(&format!("enabled={enabled}"))).await;
        Ok(true)
    }

    async fn record_visit(&self, ctx: &Context<'_>, description: String, visited_at: i64, hour_of_day: i32) -> GqlResult<String> {
        st(ctx).db.record_visit(&description, visited_at, hour_of_day).await.map_err(to_gql)
    }

    async fn create_focus_goal(&self, ctx: &Context<'_>, name: String, description: Option<String>) -> GqlResult<String> {
        let s = st(ctx);
        let id = s.db.create_focus_goal(&name, description.as_deref()).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("focus_goal_created", Some("locus_user"), Some(&id), Some(&name)).await;
        Ok(id)
    }

    async fn set_active_focus_goal(&self, ctx: &Context<'_>, id: String) -> GqlResult<bool> {
        let s = st(ctx);
        s.db.set_active_focus_goal(&id).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("focus_goal_activated", Some("locus_user"), Some(&id), None).await;
        Ok(true)
    }

    async fn clear_active_focus_goal(&self, ctx: &Context<'_>) -> GqlResult<bool> {
        let s = st(ctx);
        s.db.clear_active_focus_goal().await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("focus_goal_cleared", Some("locus_user"), None, None).await;
        Ok(true)
    }

    async fn create_simulation(&self, ctx: &Context<'_>, name: String, description: Option<String>) -> GqlResult<String> {
        let s = st(ctx);
        let id = s.db.create_simulation(&name, description.as_deref()).await.map_err(to_gql)?;
        let _ = s.db.log_audit_event("simulation_created", Some("locus_user"), Some(&id), Some(&name)).await;
        Ok(id)
    }

    async fn run_simulation(&self, ctx: &Context<'_>, id: String, hours_ahead: Option<i32>) -> GqlResult<Vec<SimulationResult>> {
        let s = st(ctx);
        let _ = s.db.update_simulation_status(&id, "running").await;
        let results = s.db.run_simulation(&id, hours_ahead.unwrap_or(0)).await.map_err(to_gql)?;
        let tuples: Vec<(String, f64, f64)> = results.into_iter().map(|(n, p, c)| (n, p, c)).collect();
        s.db.store_simulation_results(&id, &tuples).await.map_err(to_gql)?;
        let _ = s.db.update_simulation_status(&id, "completed").await;
        let _ = s.db.log_audit_event("simulation_executed", Some("locus_user"), Some(&id), None).await;
        Ok(s.db.get_simulation_results(&id).await.map_err(to_gql)?
            .into_iter().map(SimulationResult::from).collect())
    }

    async fn log_audit_event(&self, ctx: &Context<'_>, event_type: String, actor: Option<String>, resource_id: Option<String>, details: Option<String>) -> GqlResult<String> {
        st(ctx).db.log_audit_event(&event_type, actor.as_deref(), resource_id.as_deref(), details.as_deref()).await.map_err(to_gql)
    }

    /// Records a from→to space transition edge in Neo4j (LEADS_TO).
    async fn record_transition(&self, ctx: &Context<'_>, from_id: String, to_id: String) -> bool {
        if let Some(g) = &st(ctx).graph {
            g.record_transition(&from_id, &to_id).await;
            true
        } else { false }
    }

    /// Parse a natural-language input through the NLP pipeline and return
    /// the annotated document (tokens + entities).
    async fn parse_intent(&self, ctx: &Context<'_>, input: String) -> GqlResult<GqlNlpDoc> {
        let s = st(ctx);
        let nlp_doc = s.nlp.analyze(&input).await.map_err(|e| Error::new(e.to_string()))?;
        Ok(GqlNlpDoc::from(nlp_doc))
    }
}

fn to_gql(e: spaces_core::SpacesError) -> Error { Error::new(e.to_string()) }
