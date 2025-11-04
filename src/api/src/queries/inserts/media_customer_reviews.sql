INSERT INTO samples.bakehouse.media_customer_reviews
(
  review,
  franchiseID,
  review_date,
  new_id
)
VALUES
(
  ${review},
  ${franchiseID},
  COALESCE(${review_date}, CURRENT_TIMESTAMP()),
  ${new_id}
);