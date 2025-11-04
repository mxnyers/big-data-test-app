SELECT
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
FROM samples.bakehouse.sales_transactions
ORDER BY dateTime DESC
LIMIT 250;