UPDATE samples.bakehouse.sales_transactions
SET
  customerID = COALESCE(${customerID}, customerID),
  franchiseID = COALESCE(${franchiseID}, franchiseID),
  dateTime = COALESCE(${dateTime}, dateTime),
  product = COALESCE(${product}, product),
  quantity = COALESCE(${quantity}, quantity),
  unitPrice = COALESCE(${unitPrice}, unitPrice),
  totalPrice = COALESCE(${totalPrice}, totalPrice),
  paymentMethod = COALESCE(${paymentMethod}, paymentMethod),
  cardNumber = COALESCE(${cardNumber}, cardNumber)
WHERE transactionID = ${transactionID};