INSERT INTO samples.bakehouse.sales_transactions
(
  transactionID,
  customerID,
  franchiseID,
  dateTime,
  product,
  quantity,
  unitPrice,
  totalPrice,
  paymentMethod,
  cardNumber
)
VALUES
(
  ${transactionID},
  ${customerID},
  ${franchiseID},
-- Deprecated Databricks INSERT. Replace with Postgres INSERT or stored procedure.
