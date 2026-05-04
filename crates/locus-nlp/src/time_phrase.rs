//! Time-phrase extraction from NLP entities (NER DATE/TIME spans).
//!
//! `extract_time_phrases` takes an already-analyzed [`NlpDoc`] and converts
//! NER entities labeled `Date` or `Time` into structured [`TimeExpression`]
//! values with absolute or relative timestamps.

use crate::pipeline::{EntityLabel, NlpDoc};

/// A structured time expression extracted from user input.
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct TimeExpression {
    /// The raw surface text.
    pub text: String,
    /// Byte offsets in the original input.
    pub start: usize,
    pub end: usize,
    /// The resolved kind (absolute or relative).
    pub kind: TimeKind,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type")]
pub enum TimeKind {
    /// An absolute ISO-8601 timestamp.
    #[serde(rename = "absolute")]
    Absolute {
        timestamp: String,
    },
    /// A relative offset from now.
    #[serde(rename = "relative")]
    Relative {
        direction: Direction,
        quantity: u32,
        unit: TimeUnit,
    },
    /// A date/time range.
    #[serde(rename = "range")]
    Range {
        from: Box<TimeKind>,
        to: Box<TimeKind>,
    },
}

#[derive(Clone, Copy, Debug, serde::Serialize, serde::Deserialize)]
pub enum Direction {
    #[serde(rename = "past")]
    Past,
    #[serde(rename = "future")]
    Future,
}

#[derive(Clone, Copy, Debug, serde::Serialize, serde::Deserialize)]
pub enum TimeUnit {
    #[serde(rename = "minutes")]
    Minutes,
    #[serde(rename = "hours")]
    Hours,
    #[serde(rename = "days")]
    Days,
    #[serde(rename = "weeks")]
    Weeks,
    #[serde(rename = "months")]
    Months,
}

/// Extract time expressions from NER entities in the document.
///
/// Walks every entity labeled `Date` or `Time`, attempts to parse the
/// surface text into a structured [`TimeKind`], and returns the ones that
/// parse successfully.
pub fn extract_time_phrases(doc: &NlpDoc) -> Vec<TimeExpression> {
    doc.entities
        .iter()
        .filter(|e| matches!(e.label, EntityLabel::Date | EntityLabel::Time))
        .filter_map(|e| parse_entity_text(&e.text, e.start, e.end))
        .collect()
}

fn parse_entity_text(text: &str, start: usize, end: usize) -> Option<TimeExpression> {
    let lower = text.to_lowercase().trim().to_string();

    let kind = if let Some(k) = parse_relative(&lower) {
        k
    } else if let Some(k) = parse_day_name(&lower) {
        k
    } else if let Some(k) = parse_absolute_time(&lower) {
        k
    } else {
        // Fallback: treat as a date reference with a generic parse attempt.
        parse_date_string(&lower)?
    };

    Some(TimeExpression {
        text: text.to_string(),
        start,
        end,
        kind,
    })
}

fn parse_relative(s: &str) -> Option<TimeKind> {
    // "in X minutes/hours/days/weeks/months"
    let re = regex::Regex::new(
        r"in\s+(\d+)\s*(an\s+)?(minutes?|mins?|hours?|hrs?|days?|weeks?|wks?|months?)"
    ).ok()?;
    let caps = re.captures(s)?;
    let quantity: u32 = caps.get(1)?.as_str().parse().ok()?;
    let unit_str = caps.get(3)?.as_str();

    let unit = match unit_str.chars().next()? {
        'm' if unit_str.contains("month") => TimeUnit::Months,
        'm' => TimeUnit::Minutes,
        'h' => TimeUnit::Hours,
        'd' => TimeUnit::Days,
        'w' => TimeUnit::Weeks,
        _ => return None,
    };

    Some(TimeKind::Relative {
        direction: Direction::Future,
        quantity,
        unit,
    })
}

fn parse_day_name(s: &str) -> Option<TimeKind> {
    let days = [
        "sunday", "monday", "tuesday", "wednesday", "thursday", "friday",
        "saturday",
    ];
    let s = s.trim();

    // "tomorrow"
    if s == "tomorrow" {
        return Some(TimeKind::Relative {
            direction: Direction::Future,
            quantity: 1,
            unit: TimeUnit::Days,
        });
    }

    // "yesterday"
    if s == "yesterday" {
        return Some(TimeKind::Relative {
            direction: Direction::Past,
            quantity: 1,
            unit: TimeUnit::Days,
        });
    }

    // "today"
    if s == "today" {
        return Some(TimeKind::Relative {
            direction: Direction::Future,
            quantity: 0,
            unit: TimeUnit::Days,
        });
    }

    // "next <dayname>" e.g. "next monday"
    if let Some(day) = s.strip_prefix("next ") {
        if days.iter().any(|d| *d == day) {
            return Some(TimeKind::Relative {
                direction: Direction::Future,
                quantity: 1,
                unit: TimeUnit::Weeks,
            });
        }
    }

    // Bare day name e.g. "friday" — next occurrence of that day
    if days.iter().any(|d| *d == s) {
        return Some(TimeKind::Relative {
            direction: Direction::Future,
            quantity: 1,
            unit: TimeUnit::Weeks,
        });
    }

    None
}

fn parse_absolute_time(s: &str) -> Option<TimeKind> {
    // "3pm", "3:00pm", "15:00", "3 p.m.", "3 AM", "noon", "midnight"
    let s = s.trim().to_lowercase();

    if s == "noon" {
        return Some(TimeKind::Absolute {
            timestamp: "12:00:00".into(),
        });
    }
    if s == "midnight" {
        return Some(TimeKind::Absolute {
            timestamp: "00:00:00".into(),
        });
    }

    // Match HH:MM with optional am/pm
    let re = regex::Regex::new(
        r"(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?"
    ).ok()?;
    let caps = re.captures(&s)?;
    let hour: u32 = caps.get(1)?.as_str().parse().ok()?;
    let minute: u32 = caps
        .get(2)
        .and_then(|m| m.as_str().parse().ok())
        .unwrap_or(0);
    let ampm = caps.get(3).map(|m| m.as_str());

    if hour > 23 || minute > 59 {
        return None;
    }

    let hour24 = match ampm {
        Some(a) if a.starts_with('p') && hour != 12 => hour + 12,
        Some(a) if a.starts_with('a') && hour == 12 => 0,
        _ => hour,
    };

    Some(TimeKind::Absolute {
        timestamp: format!("{hour24:02}:{minute:02}:00"),
    })
}

fn parse_date_string(s: &str) -> Option<TimeKind> {
    // "2026-05-15", "May 15", "May 15th", "15 May 2026"
    let s = s.trim().to_lowercase();

    let months = [
        "january", "february", "march", "april", "may", "june", "july",
        "august", "september", "october", "november", "december",
    ];

    for (idx, name) in months.iter().enumerate() {
        if s.contains(name) {
            let month_num = idx + 1;

            // Try to extract a day number near the month name.
            let re = regex::Regex::new(r"(\d{1,2})(?:st|nd|rd|th)?").ok()?;
            if let Some(caps) = re.captures(&s) {
                let day: u32 = caps.get(1)?.as_str().parse().ok()?;
                if day >= 1 && day <= 31 {
                    return Some(TimeKind::Absolute {
                        timestamp: format!("{:04}-{month_num:02}-{day:02}", 2026),
                    });
                }
            }
        }
    }

    // ISO date "2026-05-15"
    let re = regex::Regex::new(r"(\d{4})-(\d{2})-(\d{2})").ok()?;
    if let Some(caps) = re.captures(&s) {
        let year: u32 = caps.get(1)?.as_str().parse().ok()?;
        let month: u32 = caps.get(2)?.as_str().parse().ok()?;
        let day: u32 = caps.get(3)?.as_str().parse().ok()?;
        if month >= 1 && month <= 12 && day >= 1 && day <= 31 {
            return Some(TimeKind::Absolute {
                timestamp: format!("{year:04}-{month:02}-{day:02}"),
            });
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pipeline::Entity;

    fn make_doc(text: &str, entities: Vec<Entity>) -> NlpDoc {
        NlpDoc {
            text: text.to_string(),
            entities,
            ..Default::default()
        }
    }

    fn entity(start: usize, end: usize, text: &str, label: EntityLabel) -> Entity {
        Entity {
            start,
            end,
            text: text.to_string(),
            label,
            score: 0.9,
            linked_id: None,
        }
    }

    #[test]
    fn tomorrow_is_relative_day() {
        let doc = make_doc(
            "remind me tomorrow",
            vec![entity(10, 18, "tomorrow", EntityLabel::Date)],
        );
        let results = extract_time_phrases(&doc);
        assert_eq!(results.len(), 1);
        match &results[0].kind {
            TimeKind::Relative { direction, quantity, unit } => {
                assert!(matches!(direction, Direction::Future));
                assert_eq!(*quantity, 1);
                assert!(matches!(unit, TimeUnit::Days));
            }
            _ => panic!("expected relative"),
        }
    }

    #[test]
    fn in_three_hours_is_relative() {
        let doc = make_doc(
            "call her in 3 hours",
            vec![entity(9, 20, "in 3 hours", EntityLabel::Time)],
        );
        let results = extract_time_phrases(&doc);
        assert_eq!(results.len(), 1);
        match &results[0].kind {
            TimeKind::Relative { direction, quantity, unit } => {
                assert!(matches!(direction, Direction::Future));
                assert_eq!(*quantity, 3);
                assert!(matches!(unit, TimeUnit::Hours));
            }
            _ => panic!("expected relative"),
        }
    }

    #[test]
    fn noon_is_absolute_time() {
        let doc = make_doc(
            "meeting at noon",
            vec![entity(11, 15, "noon", EntityLabel::Time)],
        );
        let results = extract_time_phrases(&doc);
        assert_eq!(results.len(), 1);
        match &results[0].kind {
            TimeKind::Absolute { timestamp } => {
                assert_eq!(timestamp, "12:00:00");
            }
            _ => panic!("expected absolute"),
        }
    }

    #[test]
    fn three_pm_is_absolute() {
        let doc = make_doc(
            "meeting at 3pm",
            vec![entity(11, 14, "3pm", EntityLabel::Time)],
        );
        let results = extract_time_phrases(&doc);
        assert_eq!(results.len(), 1);
        match &results[0].kind {
            TimeKind::Absolute { timestamp } => {
                assert_eq!(timestamp, "15:00:00");
            }
            _ => panic!("expected absolute"),
        }
    }

    #[test]
    fn next_tuesday_is_relative_week() {
        let doc = make_doc(
            "schedule for next tuesday",
            vec![entity(13, 25, "next tuesday", EntityLabel::Date)],
        );
        let results = extract_time_phrases(&doc);
        assert_eq!(results.len(), 1);
        match &results[0].kind {
            TimeKind::Relative { direction, quantity, unit } => {
                assert!(matches!(direction, Direction::Future));
                assert_eq!(*quantity, 1);
                assert!(matches!(unit, TimeUnit::Weeks));
            }
            _ => panic!("expected relative"),
        }
    }

    #[test]
    fn non_time_entities_ignored() {
        let doc = make_doc(
            "email Sarah about the project",
            vec![
                entity(6, 11, "Sarah", EntityLabel::Person),
                entity(22, 29, "project", EntityLabel::Misc),
            ],
        );
        assert!(extract_time_phrases(&doc).is_empty());
    }

    #[test]
    fn iso_date_parsed() {
        let doc = make_doc(
            "deadline is 2026-06-15",
            vec![entity(12, 22, "2026-06-15", EntityLabel::Date)],
        );
        let results = extract_time_phrases(&doc);
        assert_eq!(results.len(), 1);
        match &results[0].kind {
            TimeKind::Absolute { timestamp } => {
                assert_eq!(timestamp, "2026-06-15");
            }
            _ => panic!("expected absolute date"),
        }
    }
}
