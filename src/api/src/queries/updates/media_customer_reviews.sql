UPDATE samples.bakehouse.media_customer_reviews
SET
  review = COALESCE(${review}, review),
  franchiseID = COALESCE(${franchiseID}, franchiseID),
  review_date = COALESCE(${review_date}, review_date),
WHERE new_id = ${new_id};
-- Deprecated Databricks UPDATE. Replace with Postgres UPDATE or stored procedure.
