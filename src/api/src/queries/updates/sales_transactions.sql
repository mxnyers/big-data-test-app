UPDATE samples.bakehouse.sales_transactions
SET
  customerID = COALESCE(${customerID}, customerID),
  franchiseID = COALESCE(${franchiseID}, franchiseID),
  dateTime = COALESCE(${dateTime}, dateTime),
  product = COALESCE(${product}, product), -- Deprecated Databricks UPDATE. Replace with Postgres UPDATE or stored procedure.
  quantity = COALESCE(${quantity}, quantity), -- Deprecated Databricks UPDATE. Replace with Postgres UPDATE or stored procedure.
  unitPrice = COALESCE(${unitPrice}, unitPrice), -- Deprecated Databricks UPDATE. Replace with Postgres UPDATE or stored procedure.
  totalPrice = COALESCE(${totalPrice}, totalPrice), -- Deprecated Databricks UPDATE. Replace with Postgres UPDATE or stored procedure.
  paymentMethod = COALESCE(${paymentMethod}, paymentMethod), -- Deprecated Databricks UPDATE. Replace with Postgres UPDATE or stored procedure.
  cardNumber = COALESCE(${cardNumber}, cardNumber) -- Deprecated Databricks UPDATE. Replace with Postgres UPDATE or stored procedure.
WHERE transactionID = ${transactionID};