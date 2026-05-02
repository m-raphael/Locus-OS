use neo4rs::{query, Graph};

#[derive(Clone)]
pub struct GraphDb(Graph);

impl GraphDb {
    pub async fn try_connect(uri: &str, user: &str, password: &str) -> Result<Self, neo4rs::Error> {
        let graph = Graph::new(uri, user, password).await?;
        Ok(Self(graph))
    }

    // ── Write: mirror SQLite writes into Neo4j ────────────────────────────

    pub async fn sync_space(&self, id: &str, description: &str, mode: &str) {
        let _ = self.0.run(
            query("MERGE (s:Space {id: $id}) SET s.description = $desc, s.mode = $mode")
                .param("id", id)
                .param("desc", description)
                .param("mode", mode),
        ).await;
    }

    pub async fn sync_flow(&self, id: &str, space_id: &str, order_index: i64) {
        let _ = self.0.run(
            query(
                "MERGE (f:Flow {id: $id}) SET f.order_index = $oi
                 WITH f MATCH (s:Space {id: $sid})
                 MERGE (s)-[:HAS_FLOW]->(f)",
            )
            .param("id", id)
            .param("oi", order_index)
            .param("sid", space_id),
        ).await;
    }

    pub async fn sync_module(&self, id: &str, flow_id: &str, component_type: &str) {
        let _ = self.0.run(
            query(
                "MERGE (m:Module {id: $id}) SET m.component_type = $ct
                 WITH m MATCH (f:Flow {id: $fid})
                 MERGE (f)-[:HAS_MODULE]->(m)",
            )
            .param("id", id)
            .param("ct", component_type)
            .param("fid", flow_id),
        ).await;
    }

    pub async fn sync_memory(&self, id: &str, content: &str, space_id: Option<&str>) {
        match space_id {
            Some(sid) => {
                let _ = self.0.run(
                    query(
                        "MERGE (m:Memory {id: $id}) SET m.content = $content
                         WITH m MATCH (s:Space {id: $sid})
                         MERGE (m)-[:RELATES_TO]->(s)",
                    )
                    .param("id", id)
                    .param("content", content)
                    .param("sid", sid),
                ).await;
            }
            None => {
                let _ = self.0.run(
                    query("MERGE (m:Memory {id: $id}) SET m.content = $content")
                        .param("id", id)
                        .param("content", content),
                ).await;
            }
        }
    }

    // ── Write: record a space → space transition for path learning ────────

    pub async fn record_transition(&self, from_id: &str, to_id: &str) {
        let _ = self.0.run(
            query(
                "MATCH (a:Space {id: $from}), (b:Space {id: $to})
                 MERGE (a)-[r:LEADS_TO]->(b)
                 ON CREATE SET r.count = 1
                 ON MATCH SET r.count = r.count + 1",
            )
            .param("from", from_id)
            .param("to", to_id),
        ).await;
    }

    // ── Read: graph traversal queries ─────────────────────────────────────

    /// Spaces reachable within 3 hops from the given space.
    pub async fn related_spaces(&self, space_id: &str, limit: usize) -> Vec<String> {
        let Ok(mut result) = self.0.execute(
            query(
                "MATCH (s:Space {id: $id})-[*1..3]-(r:Space)
                 WHERE r.id <> $id
                 RETURN DISTINCT r.id AS id LIMIT $limit",
            )
            .param("id", space_id)
            .param("limit", limit as i64),
        ).await else { return vec![]; };

        let mut ids = vec![];
        while let Ok(Some(row)) = result.next().await {
            if let Ok(id) = row.get::<String>("id") {
                ids.push(id);
            }
        }
        ids
    }

    /// Ordered space IDs along the shortest LEADS_TO path to a target attention mode.
    pub async fn attention_path(&self, from_space_id: &str, target_mode: &str) -> Vec<String> {
        let Ok(mut result) = self.0.execute(
            query(
                "MATCH path = (start:Space {id: $id})-[:LEADS_TO*1..8]->(end:Space {mode: $mode})
                 UNWIND nodes(path) AS n
                 RETURN n.id AS id
                 LIMIT 10",
            )
            .param("id", from_space_id)
            .param("mode", target_mode),
        ).await else { return vec![]; };

        let mut ids = vec![];
        while let Ok(Some(row)) = result.next().await {
            if let Ok(id) = row.get::<String>("id") {
                ids.push(id);
            }
        }
        ids
    }
}
