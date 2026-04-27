use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Verb {
    Open,
    Find,
    Capture,
    Recover,
    Mode,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Modifier {
    Time(String),
    Space(String),
    Person(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntentJson {
    pub verb: Verb,
    pub subject: Option<String>,
    pub modifiers: Vec<Modifier>,
    pub confidence: f32,
    pub raw: String,
}

pub fn parse(input: &str) -> IntentJson {
    let lower = input.trim().to_lowercase();
    let words: Vec<&str> = lower.split_whitespace().collect();

    let (verb, confidence) = classify_verb(&words);
    let subject = extract_subject(&words, &verb);

    IntentJson {
        verb,
        subject,
        modifiers: vec![],
        confidence,
        raw: input.to_string(),
    }
}

fn classify_verb(words: &[&str]) -> (Verb, f32) {
    let first = words.first().copied().unwrap_or("");
    match first {
        "open" | "show" | "launch" | "start" => (Verb::Open, 0.9),
        "find" | "search" | "look" | "where" => (Verb::Find, 0.9),
        "note" | "capture" | "write" | "save" | "log" => (Verb::Capture, 0.9),
        "recover" | "restore" | "undo" | "revert" => (Verb::Recover, 0.9),
        "mode" | "switch" | "focus" | "set" => (Verb::Mode, 0.85),
        _ => {
            // fallback: scan all words for verb hints
            for &w in words {
                match w {
                    "open" | "show" => return (Verb::Open, 0.6),
                    "find" | "search" => return (Verb::Find, 0.6),
                    "focus" | "mode" => return (Verb::Mode, 0.6),
                    _ => {}
                }
            }
            (Verb::Unknown, 0.1)
        }
    }
}

fn extract_subject(words: &[&str], verb: &Verb) -> Option<String> {
    if words.len() < 2 {
        return None;
    }
    // skip the first word (verb), join the rest
    let rest = words[1..].join(" ");
    if rest.is_empty() {
        return None;
    }

    // for Mode verb, extract the mode name if present
    if *verb == Verb::Mode {
        for &candidate in &["open", "focus", "recovery", "mirror"] {
            if rest.contains(candidate) {
                return Some(candidate.to_string());
            }
        }
    }

    Some(rest)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn open_verb() {
        let r = parse("open deep work");
        assert_eq!(r.verb, Verb::Open);
        assert_eq!(r.subject.as_deref(), Some("deep work"));
    }

    #[test]
    fn mode_focus() {
        let r = parse("mode focus");
        assert_eq!(r.verb, Verb::Mode);
        assert_eq!(r.subject.as_deref(), Some("focus"));
    }

    #[test]
    fn find_verb() {
        let r = parse("find my notes from last week");
        assert_eq!(r.verb, Verb::Find);
    }

    #[test]
    fn unknown_falls_back() {
        let r = parse("hello world");
        assert_eq!(r.verb, Verb::Unknown);
        assert!(r.confidence < 0.5);
    }

    #[test]
    fn empty_input() {
        let r = parse("");
        assert_eq!(r.verb, Verb::Unknown);
        assert!(r.subject.is_none());
    }
}
