use locus_parser::{IntentJson, Verb};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AgentError {
    #[error("db error: {0}")]
    Db(#[from] spaces_core::SpacesError),
}

pub type Result<T> = std::result::Result<T, AgentError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentContext {
    pub intent: IntentJson,
    pub active_space_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum AgentAction {
    CreateSpace {
        description: String,
        mode: String,
        ephemeral: bool,
    },
    SetMode {
        space_id: String,
        mode: String,
    },
    FindSpace {
        query: String,
    },
    Noop {
        reason: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    pub action: AgentAction,
    pub confidence: f32,
    pub message: String,
    /// Set when the action creates a new Space — frontend uses this to activate it.
    pub new_space_id: Option<String>,
}

/// Pure routing: intent → action. No I/O — execution happens in the command layer.
pub fn route(ctx: &AgentContext) -> AgentResult {
    let intent = &ctx.intent;

    match &intent.verb {
        Verb::Open => {
            let description = intent
                .subject
                .clone()
                .unwrap_or_else(|| intent.raw.clone());
            AgentResult {
                confidence: intent.confidence,
                message: format!("Opening '{}'", description),
                action: AgentAction::CreateSpace {
                    description,
                    mode: "open".into(),
                    ephemeral: false,
                },
                new_space_id: None,
            }
        }

        Verb::Capture => {
            let description = intent
                .subject
                .clone()
                .unwrap_or_else(|| "Quick capture".into());
            AgentResult {
                confidence: intent.confidence,
                message: format!("Captured '{}'", description),
                action: AgentAction::CreateSpace {
                    description,
                    mode: "open".into(),
                    ephemeral: true,
                },
                new_space_id: None,
            }
        }

        Verb::Mode => match (&intent.subject, &ctx.active_space_id) {
            (Some(mode), Some(space_id)) => AgentResult {
                confidence: intent.confidence,
                message: format!("Switching to {} mode", mode),
                action: AgentAction::SetMode {
                    space_id: space_id.clone(),
                    mode: mode.clone(),
                },
                new_space_id: None,
            },
            _ => noop("No active space to change mode on", 0.0),
        },

        Verb::Recover => match &ctx.active_space_id {
            Some(space_id) => AgentResult {
                confidence: intent.confidence,
                message: "Entering recovery mode".into(),
                action: AgentAction::SetMode {
                    space_id: space_id.clone(),
                    mode: "recovery".into(),
                },
                new_space_id: None,
            },
            None => noop("Nothing active to recover", 0.0),
        },

        Verb::Find => {
            let query = intent
                .subject
                .clone()
                .unwrap_or_else(|| intent.raw.clone());
            AgentResult {
                confidence: intent.confidence,
                message: format!("Searching for '{}'", query),
                action: AgentAction::FindSpace { query },
                new_space_id: None,
            }
        }

        Verb::Unknown => noop(&format!("Didn't understand '{}'", intent.raw), 0.0),
    }
}

/// Execute a routed action against the DB and return the final result.
pub fn execute(mut result: AgentResult, db: &spaces_core::Db) -> Result<AgentResult> {
    match &result.action {
        AgentAction::CreateSpace {
            description,
            mode,
            ephemeral,
        } => {
            let intent_id = db.create_intent(description)?;
            let mode_enum = spaces_core::AttentionMode::from_str(mode);
            let space_id = db.create_space(&intent_id, mode_enum, *ephemeral)?;
            db.add_flow(&space_id, 0)?;
            result.new_space_id = Some(space_id);
        }
        AgentAction::SetMode { space_id, mode } => {
            let mode_enum = spaces_core::AttentionMode::from_str(mode);
            db.update_space_mode(space_id, mode_enum)?;
        }
        AgentAction::FindSpace { .. } | AgentAction::Noop { .. } => {}
    }
    Ok(result)
}

fn noop(reason: &str, confidence: f32) -> AgentResult {
    AgentResult {
        action: AgentAction::Noop {
            reason: reason.into(),
        },
        confidence,
        message: reason.into(),
        new_space_id: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use locus_parser::parse;

    fn ctx(input: &str, space_id: Option<&str>) -> AgentContext {
        AgentContext {
            intent: parse(input),
            active_space_id: space_id.map(str::to_string),
        }
    }

    #[test]
    fn open_routes_to_create_space() {
        let r = route(&ctx("open deep work", None));
        assert!(matches!(r.action, AgentAction::CreateSpace { ephemeral: false, .. }));
        assert!(r.confidence > 0.5);
    }

    #[test]
    fn capture_creates_ephemeral_space() {
        let r = route(&ctx("capture quick idea", None));
        assert!(matches!(r.action, AgentAction::CreateSpace { ephemeral: true, .. }));
    }

    #[test]
    fn mode_with_active_space_routes_set_mode() {
        let r = route(&ctx("mode focus", Some("space-abc")));
        assert!(
            matches!(&r.action, AgentAction::SetMode { space_id, mode } if space_id == "space-abc" && mode == "focus")
        );
    }

    #[test]
    fn mode_without_active_space_is_noop() {
        let r = route(&ctx("mode focus", None));
        assert!(matches!(r.action, AgentAction::Noop { .. }));
    }

    #[test]
    fn recover_sets_recovery_mode() {
        let r = route(&ctx("recover", Some("space-xyz")));
        assert!(
            matches!(&r.action, AgentAction::SetMode { mode, .. } if mode == "recovery")
        );
    }

    #[test]
    fn unknown_input_is_noop() {
        let r = route(&ctx("hello there", None));
        assert!(matches!(r.action, AgentAction::Noop { .. }));
        assert_eq!(r.confidence, 0.0);
    }

    #[test]
    fn execute_create_space_sets_new_space_id() {
        let db = spaces_core::Db::open_in_memory().unwrap();
        let r = route(&ctx("open planning", None));
        let r = execute(r, &db).unwrap();
        assert!(r.new_space_id.is_some());
        // Space should exist in DB
        let spaces = db.list_spaces().unwrap();
        assert_eq!(spaces.len(), 1);
        assert_eq!(spaces[0].description, "planning");
    }

    #[test]
    fn execute_set_mode_updates_db() {
        let db = spaces_core::Db::open_in_memory().unwrap();
        // Create a space first
        let iid = db.create_intent("test").unwrap();
        let sid = db.create_space(&iid, spaces_core::AttentionMode::Open, false).unwrap();

        let r = route(&ctx("mode focus", Some(&sid)));
        execute(r, &db).unwrap();

        let space = db.get_space(&sid).unwrap();
        assert_eq!(space.attention_mode, spaces_core::AttentionMode::Focus);
    }
}
