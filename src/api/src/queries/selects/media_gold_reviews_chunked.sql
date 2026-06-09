-- Deprecated: Databricks SQL removed. Replace with Postgres query or stored procedure in production.
SELECT *
FROM media_gold_reviews_chunked
ORDER BY chunk_id;