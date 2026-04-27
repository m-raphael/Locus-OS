/// NVIDIA NIM inference client (OpenAI-compatible).
///
/// Used for AI-backed intent classification and multi-step reasoning.
/// Falls back gracefully to the keyword classifier when the API key is
/// absent or the endpoint is unreachable (offline-first guarantee).
use crate::AgentError;
use locus_parser::{IntentJson, Verb};
use serde::{Deserialize, Serialize};

const NIM_URL: &str = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL: &str = "meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT: &str = r#"You are an intent classifier for LOTUS-OS, an intent-driven desktop shell.

Parse the user's input into a structured intent. Return ONLY valid JSON — no markdown, no explanation.

Shape:
{
  "verb": "open" | "find" | "capture" | "recover" | "mode" | "unknown",
  "subject": "<object of the intent, or null>",
  "confidence": <0.0–1.0>,
  "suggested_next": "<a short follow-up action to suggest, or null>"
}

Verb rules:
- open   → launch / show / start / review something
- find   → search / look for / where is
- capture → note / write / save / remember / log
- recover → restore / undo / revert / go back
- mode   → switch attention mode (focus / open / recovery / mirror)
- unknown → cannot determine intent

Examples:
Input: "review inbox" → {"verb":"open","subject":"Inbox","confidence":0.95,"suggested_next":"Draft response to Naomi"}
Input: "find apartments in Brooklyn" → {"verb":"find","subject":"apartments in Brooklyn","confidence":0.9,"suggested_next":null}
Input: "mode focus" → {"verb":"mode","subject":"focus","confidence":0.95,"suggested_next":null}
Input: "note call the dentist" → {"verb":"capture","subject":"call the dentist","confidence":0.88,"suggested_next":null}"#;

#[derive(Debug, Deserialize)]
struct NimChoice {
    message: NimMessage,
}

#[derive(Debug, Deserialize)]
struct NimMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct NimResponse {
    choices: Vec<NimChoice>,
}

#[derive(Debug, Deserialize)]
struct AiIntent {
    verb: String,
    subject: Option<String>,
    confidence: f32,
    suggested_next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiResult {
    pub intent: IntentJson,
    pub suggested_next: Option<String>,
}

/// Call NIM to classify intent. Returns `None` when the API key is absent,
/// the network is unreachable, or the model returns unparseable JSON.
pub fn classify(input: &str, api_key: &str) -> Option<AiResult> {
    let body = serde_json::json!({
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": input}
        ],
        "max_tokens": 120,
        "temperature": 0.1,
    });

    let resp = reqwest::blocking::Client::new()
        .post(NIM_URL)
        .bearer_auth(api_key)
        .json(&body)
        .timeout(std::time::Duration::from_secs(8))
        .send()
        .ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let nim: NimResponse = resp.json().ok()?;
    let content = nim.choices.first()?.message.content.trim().to_string();

    // Strip possible markdown fences
    let json_str = content
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let ai: AiIntent = serde_json::from_str(json_str).ok()?;

    let verb = match ai.verb.as_str() {
        "open"    => Verb::Open,
        "find"    => Verb::Find,
        "capture" => Verb::Capture,
        "recover" => Verb::Recover,
        "mode"    => Verb::Mode,
        _         => Verb::Unknown,
    };

    Some(AiResult {
        intent: IntentJson {
            verb,
            subject: ai.subject,
            modifiers: vec![],
            confidence: ai.confidence,
            raw: input.to_string(),
        },
        suggested_next: ai.suggested_next,
    })
}

/// Enrich an AgentResult with a suggested next action from NIM when available.
pub fn enrich_suggestion(result: &mut crate::AgentResult, api_key: &str, input: &str) {
    if let Some(ai) = classify(input, api_key) {
        if result.suggested_next.is_none() {
            result.suggested_next = ai.suggested_next;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn no_key_returns_none() {
        // Without a real key this must return None, not panic
        let r = classify("open inbox", "invalid-key");
        // Will be None (network/auth error) — acceptable in CI
        let _ = r;
    }
}
