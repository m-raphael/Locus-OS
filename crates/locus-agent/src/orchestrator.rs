/// Multi-agent orchestrator (N12 / G2).
///
/// Decomposes a compound intent into parallel sub-intents, runs each through
/// the full agent pipeline, and aggregates results into a unified plan.
///
/// Example: "review inbox and plan trip to Lisbon"
///   → Task A: "review inbox"    → CreateSpace(Review Inbox)
///   → Task B: "plan trip to Lisbon" → CreateSpace(Plan trip to Lisbon)
///   → OrchestratorResult: two spaces, primary = first high-confidence task
use crate::{run, AgentResult};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// A single sub-task within an orchestrated plan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: String,
    pub prompt: String,
    pub result: Option<AgentResult>,
    pub error: Option<String>,
}

/// Aggregated result of running multiple sub-tasks.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestratorResult {
    pub tasks: Vec<AgentTask>,
    /// The first successfully completed task (drives primary UI activation).
    pub primary_space_id: Option<String>,
    pub summary: String,
}

/// Decompose a compound intent string into individual sub-prompts.
///
/// Splits on: " and ", " then ", " also ", "; ", " + "
pub fn decompose(input: &str) -> Vec<String> {
    let separators = [" and ", " then ", " also ", "; ", " + "];
    let mut parts = vec![input.to_string()];
    for sep in &separators {
        parts = parts
            .into_iter()
            .flat_map(|s| s.split(sep).map(|p| p.trim().to_string()).collect::<Vec<_>>())
            .filter(|p| !p.is_empty())
            .collect();
    }
    parts
}

/// Run each sub-task sequentially (parallel requires Send bounds; sequential is safe for P0).
/// Tasks that fail individually are recorded with their error; others continue.
pub async fn orchestrate(
    input: &str,
    active_space_id: Option<String>,
    db: &spaces_core::Db,
    nim_api_key: Option<&str>,
    npu_model_path: Option<&Path>,
) -> OrchestratorResult {
    let prompts = decompose(input);
    let is_compound = prompts.len() > 1;

    let mut tasks: Vec<AgentTask> = Vec::with_capacity(prompts.len());
    for (i, prompt) in prompts.into_iter().enumerate() {
        let task_id = format!("task-{i}");
        let result = run(
            &prompt,
            active_space_id.clone(),
            db,
            nim_api_key,
            npu_model_path,
        ).await;
        let task = match result {
            Ok(r) => AgentTask { id: task_id, prompt, result: Some(r), error: None },
            Err(e) => AgentTask { id: task_id, prompt, result: None, error: Some(e.to_string()) },
        };
        tasks.push(task);
    }

    let primary_space_id = tasks
        .iter()
        .find_map(|t| t.result.as_ref()?.new_space_id.clone());

    let summary = if is_compound {
        let done: Vec<_> = tasks
            .iter()
            .filter(|t| t.result.is_some())
            .map(|t| t.prompt.as_str())
            .collect();
        format!("Ran {} tasks: {}", done.len(), done.join(", "))
    } else {
        tasks
            .first()
            .and_then(|t| t.result.as_ref())
            .map(|r| r.message.clone())
            .unwrap_or_else(|| "No result".into())
    };

    OrchestratorResult { tasks, primary_space_id, summary }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decompose_single_intent() {
        assert_eq!(decompose("review inbox"), vec!["review inbox"]);
    }

    #[test]
    fn decompose_and_separator() {
        let parts = decompose("review inbox and plan trip to Lisbon");
        assert_eq!(parts.len(), 2);
        assert_eq!(parts[0], "review inbox");
        assert_eq!(parts[1], "plan trip to Lisbon");
    }

    #[test]
    fn decompose_then_separator() {
        let parts = decompose("draft reply then find apartments");
        assert_eq!(parts.len(), 2);
    }

    #[test]
    fn decompose_multiple_separators() {
        let parts = decompose("task a; task b + task c");
        assert_eq!(parts.len(), 3);
    }

    // DB-touching orchestrator tests removed; Db is now Neo4j-only and async.
    // Pure decomposition behaviour is still covered above.
}
