import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
  * @typedef {import("../generated/api").CartInput} RunInput
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

/**
  * Volume Discount Function - Buy 2, get X% off
  *
  * This function applies a percentage discount to cart lines when:
  * - The product is in the configured list
  * - The quantity is >= minQty (default: 2)
  *
  * Configuration is stored in shop metafield:
  * namespace: "volume_discount"
  * key: "rules"
  * format: { "products": ["gid://..."], "minQty": 2, "percentOff": 10 }
  *
  * @param {RunInput} input
  * @returns {CartLinesDiscountsGenerateRunResult}
  */
export function cartLinesDiscountsGenerateRun(input) {
  // Debug logging
  console.error('=== DISCOUNT FUNCTION START ===');
  console.error('Cart lines:', input.cart.lines.length);
  console.error('Discount classes:', JSON.stringify(input.discount.discountClasses));
  
  // Guard: No cart lines
  if (!input.cart.lines.length) {
    console.error('No cart lines - returning empty');
    return {operations: []};
  }

  // Guard: Check if product discounts are enabled
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasProductDiscountClass) {
    console.error('Product discount class not enabled - returning empty');
    return {operations: []};
  }
  
  console.error('Product discounts enabled - continuing');

  // Guard: No configuration found
  if (!input.shop?.metafield?.value) {
    console.error('No metafield configuration found');
    return {operations: []};
  }

  console.error('Metafield value:', input.shop.metafield.value);

  // Parse configuration
  let config = null;
  try {
    config = JSON.parse(input.shop.metafield.value);
    console.error('Parsed config:', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to parse metafield config:', error);
    return {operations: []};
  }

  // Guard: Invalid configuration
  if (!config || !config.products || !Array.isArray(config.products) || config.products.length === 0) {
    console.error('Invalid configuration: missing or empty products array');
    return {operations: []};
  }

  if (!config.percentOff || typeof config.percentOff !== 'number') {
    console.error('Invalid configuration: missing or invalid percentOff');
    return {operations: []};
  }

  const minQty = config.minQty || 2;
  const percentOff = config.percentOff;
  const configuredProductIds = new Set(config.products);

  // Find cart lines that qualify for the discount
  console.error('Checking cart lines...');
  input.cart.lines.forEach(line => {
    console.error('Line product ID:', line.merchandise?.product?.id, 'Qty:', line.quantity);
  });
  
  const qualifyingLines = input.cart.lines.filter(line => {
    // Check if line has product variant
    if (!line.merchandise?.product?.id) {
      return false;
    }

    const productId = line.merchandise.product.id;
    const quantity = line.quantity || 0;
    
    const isConfigured = configuredProductIds.has(productId);
    const meetsQty = quantity >= minQty;
    
    console.error('Product:', productId, 'Configured?', isConfigured, 'Qty meets min?', meetsQty, '(', quantity, '>=', minQty, ')');

    // Check if product is in configured list and quantity meets minimum
    return isConfigured && meetsQty;
  });

  console.error('Qualifying lines:', qualifyingLines.length);

  // Guard: No qualifying lines
  if (qualifyingLines.length === 0) {
    console.error('No qualifying lines - returning empty');
    return {operations: []};
  }

  // Create discount operations for each qualifying line
  const discountCandidates = qualifyingLines.map(line => ({
    message: `Buy ${minQty}, get ${percentOff}% off`,
    targets: [
      {
        cartLine: {
          id: line.id,
        },
      },
    ],
    value: {
      percentage: {
        value: percentOff,
      },
    },
  }));

  const operations = [
    {
      productDiscountsAdd: {
        candidates: discountCandidates,
        selectionStrategy: ProductDiscountSelectionStrategy.All,
      },
    },
  ];

  console.error('Returning', discountCandidates.length, 'discount operations');
  console.error('=== DISCOUNT FUNCTION END ===');

  return {
    operations,
  };
}
