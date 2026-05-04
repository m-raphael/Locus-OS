//! Compound-intent splitting using POS tags.
//!
//! `split_compound` takes an already-analyzed [`NlpDoc`] and uses verb positions
//! plus conjunction markers to detect clause boundaries. When two verb phrases
//! are joined by a coordinating conjunction (CCONJ) or subordinator (SCONJ),
//! we can split the original text into independent sub-intents.

use crate::pipeline::{NlpDoc, PosTag};

/// Result of compound-intent detection.
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct CompoundSplit {
    /// Whether the input contains multiple intents.
    pub is_compound: bool,
    /// Number of sub-intents detected (always >= 1).
    pub count: usize,
    /// Split sub-intents as standalone text segments.
    pub parts: Vec<String>,
}

/// Detect and split compound intents from an already-analyzed document.
///
/// The algorithm:
/// 1. Find all VERB token positions.
/// 2. Look for conjunctions between verb phrases.
/// 3. Split at conjunction boundaries where the conjunction connects two
///    clauses (i.e. a verb appears on both sides).
pub fn split_compound(doc: &NlpDoc) -> CompoundSplit {
    let tokens = &doc.tokens;
    if tokens.is_empty() {
        return CompoundSplit {
            is_compound: false,
            count: 1,
            parts: vec![doc.text.clone()],
        };
    }

    // Find indices of verb and conjunction tokens.
    let verb_indices: Vec<usize> = tokens
        .iter()
        .enumerate()
        .filter(|(_, t)| matches!(t.pos, PosTag::Verb))
        .map(|(i, _)| i)
        .collect();

    if verb_indices.len() < 2 {
        return CompoundSplit {
            is_compound: false,
            count: 1,
            parts: vec![doc.text.clone()],
        };
    }

    // Find conjunction tokens that sit between two verbs.
    let split_conj_indices: Vec<usize> = tokens
        .iter()
        .enumerate()
        .filter(|(i, t)| {
            matches!(t.pos, PosTag::Conj)
                && verb_indices.iter().any(|&vi| vi < *i)
                && verb_indices.iter().any(|&vi| vi > *i)
        })
        .map(|(i, _)| i)
        .collect();

    if split_conj_indices.is_empty() {
        // Multiple verbs without a clause-joining conjunction (e.g. "I want to
        // eat") — treat as a single intent.
        return CompoundSplit {
            is_compound: false,
            count: 1,
            parts: vec![doc.text.clone()],
        };
    }

    // Build split points: start, each conjunction boundary, end.
    let mut boundaries: Vec<usize> = vec![0];
    for &ci in &split_conj_indices {
        // The split point is just before the conjunction token starts.
        boundaries.push(tokens[ci].start);
    }
    boundaries.push(doc.text.len());

    // Extract segments, trimming whitespace and leftover conjunctions.
    let parts: Vec<String> = boundaries
        .windows(2)
        .filter_map(|w| {
            let segment = doc.text[w[0]..w[1]].trim().to_string();
            // Strip leading conjunctions from the segment start.
            let cleaned = strip_leading_conj(&segment);
            if cleaned.is_empty() {
                None
            } else {
                Some(cleaned.to_string())
            }
        })
        .collect();

    let count = parts.len();
    CompoundSplit {
        is_compound: count > 1,
        count: count.max(1),
        parts,
    }
}

/// Strip common coordinating conjunctions from the start of a segment.
fn strip_leading_conj(s: &str) -> &str {
    let s = s.trim();
    for conj in ["and ", "then ", "also ", "or "]
        .iter()
        .map(|c| c.len())
        .filter(|&len| {
            s.len() > len
                && s[..len]
                    .to_ascii_lowercase()
                    .starts_with(&s[..len].to_ascii_lowercase())
        })
    {
        return s[conj..].trim();
    }

    // Fallback: check prefix.
    let lower = s.to_ascii_lowercase();
    for prefix in ["and ", "then ", "also ", "or "] {
        if lower.starts_with(prefix) {
            return s[prefix.len()..].trim();
        }
    }
    s
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pipeline::{PosTag, Token};

    fn make_doc(text: &str, tokens: Vec<Token>) -> NlpDoc {
        NlpDoc {
            text: text.to_string(),
            tokens,
            ..Default::default()
        }
    }

    fn token(start: usize, end: usize, surface: &str, pos: PosTag) -> Token {
        Token {
            start,
            end,
            surface: surface.to_string(),
            lemma: None,
            pos,
        }
    }

    #[test]
    fn single_verb_no_split() {
        let doc = make_doc(
            "Draft an email to Sarah",
            vec![
                token(0, 5, "Draft", PosTag::Verb),
                token(6, 8, "an", PosTag::Det),
                token(9, 14, "email", PosTag::Noun),
                token(15, 17, "to", PosTag::Prep),
                token(18, 23, "Sarah", PosTag::Noun),
            ],
        );
        let result = split_compound(&doc);
        assert!(!result.is_compound);
        assert_eq!(result.count, 1);
    }

    #[test]
    fn two_verbs_with_conjunction_splits() {
        // "Draft an email and schedule a call"
        let doc = make_doc(
            "Draft an email and schedule a call",
            vec![
                token(0, 5, "Draft", PosTag::Verb),
                token(6, 8, "an", PosTag::Det),
                token(9, 14, "email", PosTag::Noun),
                token(15, 18, "and", PosTag::Conj),
                token(19, 27, "schedule", PosTag::Verb),
                token(28, 29, "a", PosTag::Det),
                token(30, 34, "call", PosTag::Noun),
            ],
        );
        let result = split_compound(&doc);
        assert!(result.is_compound);
        assert_eq!(result.count, 2);
        assert_eq!(result.parts[0], "Draft an email");
        assert_eq!(result.parts[1], "schedule a call");
    }

    #[test]
    fn two_verbs_no_conjunction() {
        // "I want to draft" — two verbs but no clause-joining conjunction
        let doc = make_doc(
            "I want to draft",
            vec![
                token(0, 1, "I", PosTag::Pron),
                token(2, 6, "want", PosTag::Verb),
                token(7, 9, "to", PosTag::Prep),
                token(10, 15, "draft", PosTag::Verb),
            ],
        );
        let result = split_compound(&doc);
        assert!(!result.is_compound);
    }

    #[test]
    fn three_verbs_with_multiple_conjunctions() {
        // "Email John then call Sarah and draft doc"
        let doc = make_doc(
            "Email John then call Sarah and draft doc",
            vec![
                token(0, 5, "Email", PosTag::Verb),
                token(6, 10, "John", PosTag::Noun),
                token(11, 15, "then", PosTag::Conj),
                token(16, 20, "call", PosTag::Verb),
                token(21, 26, "Sarah", PosTag::Noun),
                token(27, 30, "and", PosTag::Conj),
                token(31, 36, "draft", PosTag::Verb),
                token(37, 40, "doc", PosTag::Noun),
            ],
        );
        let result = split_compound(&doc);
        assert!(result.is_compound);
        assert_eq!(result.count, 3);
        assert_eq!(result.parts[0], "Email John");
        assert_eq!(result.parts[1], "call Sarah");
        assert_eq!(result.parts[2], "draft doc");
    }
}
