// import { useState, useEffect } from "react";
// import { useFetcher,useLoaderData } from "react-router";
// import { useAppBridge } from "@shopify/app-bridge-react";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";

// /**
//  * LOADER - Fetches existing configuration from shop metafield
//  */
// export const loader = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
  
//   // Query shop metafield and shop ID
//   const response = await admin.graphql(`
//     #graphql
//     query GetConfig {
//       shop {
//         id
//         volumeDiscount: metafield(
//           namespace: "volume_discount"
//           key: "rules"
//         ) {
//           value
//         }
//       }
//     }
//   `);
  
//   const data = await response.json();
//   const shop = data.data.shop;
  
//   // Parse existing config or use defaults
//   let config = {
//     products: [],
//     minQty: 2,
//     percentOff: 10,
//   };
  
//   if (shop.volumeDiscount?.value) {
//     try {
//       config = JSON.parse(shop.volumeDiscount.value);
//     } catch (error) {
//       console.error("Failed to parse config:", error);
//     }
//   }
  
//   // Fetch product details for configured products
//   let productDetails = [];
//   if (config.products && config.products.length > 0) {
//     const productResponse = await admin.graphql(`
//       #graphql
//       query GetProducts($ids: [ID!]!) {
//         nodes(ids: $ids) {
//           ... on Product {
//             id
//             title
//             handle
//             featuredImage {
//               url
//               altText
//             }
//           }
//         }
//       }
//     `, {
//       variables: {
//         ids: config.products,
//       },
//     });
    
//     const productData = await productResponse.json();
//     productDetails = productData.data.nodes.filter(node => node !== null);
//   }
  
//   return {
//     config,
//     shopId: shop.id,
//     productDetails,
//   };
// };

// /**
//  * ACTION - Saves configuration to shop metafield
//  */
// export const action = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();
//   const actionType = formData.get("actionType");
  
//   if (actionType === "saveConfig") {
//     const productIds = JSON.parse(formData.get("productIds"));
//     const percentOff = parseInt(formData.get("percentOff"), 10);
//     const shopId = formData.get("shopId");
    
//     // Validate input
//     if (percentOff < 1 || percentOff > 80) {
//       return { 
//         success: false, 
//         error: "Discount percentage must be between 1% and 80%" 
//       };
//     }
    
//     if (!productIds || productIds.length === 0) {
//       return { 
//         success: false, 
//         error: "Please select at least one product" 
//       };
//     }
    
//     // Build config object
//     const config = {
//       products: productIds,
//       minQty: 2,
//       percentOff,
//     };
    
//     // Save to metafield
//     const response = await admin.graphql(`
//       #graphql
//       mutation SetConfig($metafields: [MetafieldsSetInput!]!) {
//         metafieldsSet(metafields: $metafields) {
//           metafields {
//             id
//             namespace
//             key
//             value
//           }
//           userErrors {
//             field
//             message
//           }
//         }
//       }
//     `, {
//       variables: {
//         metafields: [
//           {
//             namespace: "volume_discount",
//             key: "rules",
//             type: "json",
//             value: JSON.stringify(config),
//             ownerId: shopId,
//           },
//         ],
//       },
//     });
    
//     const result = await response.json();
    
//     if (result.data.metafieldsSet.userErrors.length > 0) {
//       return { 
//         success: false, 
//         error: result.data.metafieldsSet.userErrors[0].message 
//       };
//     }
    
//     return { 
//       success: true, 
//       message: "Configuration saved successfully!",
//       config,
//     };
//   }
  
//   return { success: false, error: "Unknown action" };
// };

// /**
//  * COMPONENT - The Admin UI
//  */
// export default function Index() {
//   const loaderData = useLoaderData(); // This gets data from loader
//   const fetcher = useFetcher();
//   const shopify = useAppBridge();
  
//   // Initialize state with loader data
//   const [selectedProducts, setSelectedProducts] = useState(loaderData.productDetails || []);
//   const [percentOff, setPercentOff] = useState((loaderData.config?.percentOff || 10).toString());
  
  
//   const isLoading = ["loading", "submitting"].includes(fetcher.state) && fetcher.formMethod === "POST";
  
//   // Update state when loader data changes
//   useEffect(() => {
//     if (fetcher.data?.productDetails) {
//       setSelectedProducts(fetcher.data.productDetails);
//     }
//     if (fetcher.data?.config?.percentOff) {
//       setPercentOff(fetcher.data.config.percentOff.toString());
//     }
//   }, [fetcher.data]);
  
//   // Show toast on success
//   useEffect(() => {
//     if (fetcher.data?.success) {
//       shopify.toast.show(fetcher.data.message || "Configuration saved!");
//     }
//   }, [fetcher.data?.success, fetcher.data?.message, shopify]);
  
//   // Handle product picker
//   const handleSelectProducts = async () => {
//     try {
//       const selection = await shopify.resourcePicker({
//         type: "product",
//         multiple: true,
//         filter: {
//           variants: false, // Only products, not individual variants
//         },
//       });
      
//       if (selection && selection.length > 0) {
//         // Transform selection to our format
//         const products = selection.map(product => ({
//           id: product.id,
//           title: product.title,
//           handle: product.handle,
//           featuredImage: product.images?.[0] ? {
//             url: product.images[0].originalSrc,
//             altText: product.images[0].altText || product.title,
//           } : null,
//         }));
        
//         setSelectedProducts(products);
//       }
//     } catch (error) {
//       console.error("Product picker error:", error);
//     }
//   };
  
//   // Handle save
//   const handleSave = () => {
//     const formData = new FormData();
//     formData.append("actionType", "saveConfig");
//     formData.append("productIds", JSON.stringify(selectedProducts.map(p => p.id)));
//     formData.append("percentOff", percentOff);
//     formData.append("shopId", loaderData.shopId);
    
//     fetcher.submit(formData, { method: "post" });
//   };
  
//   // Handle remove product
//   const handleRemoveProduct = (productId) => {
//     setSelectedProducts(prev => prev.filter(p => p.id !== productId));
//   };
  
//   return (
//     <s-page heading="Volume Discount Configuration">
//       <s-text slot="subtitle">
//         Configure automatic "Buy 2, get X% off" discount for your products
//       </s-text>
      
//       <s-button 
//         slot="primary-action" 
//         onClick={handleSave}
//         {...(isLoading ? { loading: true } : {})}
//         {...(selectedProducts.length === 0 ? { disabled: true } : {})}
//       >
//         Save Configuration
//       </s-button>
      
//       {/* Success/Error Banner */}
//       {fetcher.data?.success && (
//         <s-banner status="success">
//           {fetcher.data.message}
//         </s-banner>
//       )}
      
//       {fetcher.data?.error && (
//         <s-banner status="critical">
//           {fetcher.data.error}
//         </s-banner>
//       )}
      
//       {/* Product Selection Section */}
//       <s-section heading="Select Products">
//         <s-paragraph>
//           Choose which products should have the volume discount applied. 
//           Customers will get the discount when they buy 2 or more units of any selected product.
//         </s-paragraph>
        
//         <s-stack direction="block" gap="large">
//           <s-button onClick={handleSelectProducts}>
//             Select Products ({selectedProducts.length} selected)
//           </s-button>
          
//           {/* Selected Products List */}
//           {selectedProducts.length > 0 && (
//             <s-box 
//               padding="base" 
//               borderWidth="base" 
//               borderRadius="base"
//             >
//               <s-stack direction="block" gap="base">
//                 {selectedProducts.map((product) => (
//                   <s-stack 
//                     key={product.id} 
//                     direction="inline" 
//                     gap="base"
//                     style={{ alignItems: "center", justifyContent: "space-between" }}
//                   >
//                     <s-stack direction="inline" gap="base" style={{ alignItems: "center" }}>
//                       {product.featuredImage && (
//                         <img 
//                           src={product.featuredImage.url} 
//                           alt={product.featuredImage.altText}
//                           style={{ 
//                             width: "50px", 
//                             height: "50px", 
//                             objectFit: "cover",
//                             borderRadius: "4px"
//                           }}
//                         />
//                       )}
//                       <s-text>{product.title}</s-text>
//                     </s-stack>
                    
//                     <s-button 
//                       variant="plain" 
//                       tone="critical"
//                       onClick={() => handleRemoveProduct(product.id)}
//                     >
//                       Remove
//                     </s-button>
//                   </s-stack>
//                 ))}
//               </s-stack>
//             </s-box>
//           )}
//         </s-stack>
//       </s-section>
      
//       {/* Discount Settings Section */}
//       <s-section heading="Discount Settings">
//         <s-stack direction="block" gap="base">
//           <s-text-field
//             label="Discount Percentage"
//             type="number"
//             value={percentOff}
//             onchange={(e) => setPercentOff(e.currentTarget.value)}
//             min="1"
//             max="80"
//             suffix="%"
//             helpText="Customers will get this percentage off when buying 2 or more units"
//           ></s-text-field>
          
//           <s-text-field
//             label="Minimum Quantity"
//             type="number"
//             value="2"
//             disabled
//             helpText="Fixed at 2 units for this implementation"
//           ></s-text-field>
//         </s-stack>
//       </s-section>
      
//       {/* Info Section */}
//       <s-section slot="aside" heading="How it works">
//         <s-stack direction="block" gap="base">
//           <s-paragraph>
//             • Customers will see "Buy 2, get {percentOff}% off" on selected product pages
//           </s-paragraph>
//           <s-paragraph>
//             • Discount applies automatically when 2 or more units are added to cart
//           </s-paragraph>
//           <s-paragraph>
//             • Discount is removed if quantity drops below 2
//           </s-paragraph>
//         </s-stack>
//       </s-section>
      
//       {/* Instructions Section */}
//       <s-section slot="aside" heading="Next steps">
//         <s-unordered-list>
//           <s-list-item>
//             Select products using the product picker above
//           </s-list-item>
//           <s-list-item>
//             Set your desired discount percentage (1-80%)
//           </s-list-item>
//           <s-list-item>
//             Click "Save Configuration" to activate the discount
//           </s-list-item>
//           <s-list-item>
//             Add the discount widget to your theme in the Theme Editor
//           </s-list-item>
//         </s-unordered-list>
//       </s-section>
//     </s-page>
//   );
// }

// export const headers = (headersArgs) => {
//   return boundary.headers(headersArgs);
// };

import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

/**
 * Loader: Fetch existing configuration
 */
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Fetch existing metafield with timeout
    const response = await Promise.race([
      admin.graphql(`
        #graphql
        query {
          shop {
            id
            metafield(namespace: "volume_discount", key: "rules") {
              value
            }
          }
        }
      `),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('GraphQL timeout')), 5000)
      )
    ]);

    const data = await response.json();
    
    let config = {
      products: [],
      minQty: 2,
      percentOff: 10,
    };

    if (data.data?.shop?.metafield?.value) {
      try {
        config = JSON.parse(data.data.shop.metafield.value);
      } catch (e) {
        console.error("Parse error:", e);
      }
    }

    // Fetch product details for the configured products
    let selectedProducts = [];
    if (config.products && config.products.length > 0) {
      try {
        const productsQuery = config.products.map(id => `id:${id}`).join(' OR ');
        const productsResponse = await admin.graphql(`
          #graphql
          query($query: String!) {
            products(first: 250, query: $query) {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        `, {
          variables: {
            query: productsQuery
          }
        });
        const productsData = await productsResponse.json();
        selectedProducts = productsData.data?.products?.edges.map(edge => ({
          id: edge.node.id,
          title: edge.node.title
        })) || [];
      } catch (e) {
        console.error("Error fetching product details:", e);
      }
    }

    return { 
      config, 
      selectedProducts,
      shopGid: data.data?.shop?.id,
      error: null 
    };

  } catch (error) {
    console.error("Loader error:", error);
    // Return default config on error
    return { 
      config: { products: [], minQty: 2, percentOff: 10 },
      selectedProducts: [],
      shopGid: null,
      error: null // Don't show error to user, just use defaults
    };
  }
};

/**
 * Action: Save configuration
 */
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const productIds = JSON.parse(formData.get("productIds"));
    const percentOff = parseInt(formData.get("percentOff"), 10);

    if (!productIds || productIds.length === 0) {
      return { 
        success: false, 
        error: "Please select at least one product" 
      };
    }

    if (isNaN(percentOff) || percentOff < 1 || percentOff > 80) {
      return { 
        success: false, 
        error: "Discount must be between 1-80%" 
      };
    }

    const config = {
      products: productIds,
      minQty: 2,
      percentOff: percentOff,
    };

    // First get shop ID
    const shopResponse = await admin.graphql(`
      #graphql
      query {
        shop {
          id
        }
      }
    `);
    const shopData = await shopResponse.json();
    const shopGid = shopData.data?.shop?.id;

    if (!shopGid) {
      return { 
        success: false, 
        error: "Could not determine shop ID" 
      };
    }

    // Save metafield with timeout
    const response = await Promise.race([
      admin.graphql(
        `#graphql
        mutation CreateShopMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            metafields: [{
              namespace: "volume_discount",
              key: "rules",
              type: "json",
              value: JSON.stringify(config),
              ownerId: shopGid,
            }],
          },
        }
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout')), 10000)
      )
    ]);

    const result = await response.json();

    if (result.errors) {
      return { 
        success: false, 
        error: result.errors[0].message 
      };
    }

    const userErrors = result.data?.metafieldsSet?.userErrors;
    if (userErrors && userErrors.length > 0) {
      return { 
        success: false, 
        error: userErrors[0].message 
      };
    }

    return { 
      success: true, 
      message: "Configuration saved successfully!",
      config 
    };

  } catch (error) {
    console.error("Action error:", error);
    
    // If timeout, provide manual instructions
    if (error.message === 'Save timeout' || error.message === 'GraphQL timeout') {
      return { 
        success: false, 
        error: "Network timeout - use manual configuration below",
        timeout: true
      };
    }
    
    return { 
      success: false, 
      error: error.message || "Failed to save configuration" 
    };
  }
};

/**
 * Component
 */
export default function DiscountConfig() {
  const { config: initialConfig, selectedProducts: loadedProducts, shopGid, error: loaderError } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [selectedProducts, setSelectedProducts] = useState(loadedProducts || []);
  const [percentOff, setPercentOff] = useState(initialConfig?.percentOff?.toString() || "10");

  const isSaving = fetcher.state === "submitting";
  const actionData = fetcher.data;

  const handleSelectProducts = async () => {
    try {
      const selection = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        action: "select",
      });

      if (selection && selection.length > 0) {
        setSelectedProducts(selection);
        shopify.toast.show(`${selection.length} product(s) selected`);
      }
    } catch (error) {
      console.error("Product picker error:", error);
      shopify.toast.show("Error selecting products", { isError: true });
    }
  };

  const handleSave = () => {
    if (selectedProducts.length === 0) {
      shopify.toast.show("Please select at least one product", { isError: true });
      return;
    }

    const percent = parseInt(percentOff, 10);
    if (isNaN(percent) || percent < 1 || percent > 80) {
      shopify.toast.show("Discount must be between 1-80%", { isError: true });
      return;
    }

    const formData = new FormData();
    formData.append("productIds", JSON.stringify(selectedProducts.map(p => p.id)));
    formData.append("percentOff", percent.toString());

    fetcher.submit(formData, { method: "POST" });
  };

  // Show toast on success
  if (actionData?.success && fetcher.state === "idle") {
    setTimeout(() => {
      shopify.toast.show(actionData.message);
    }, 100);
  }

  const manualConfig = selectedProducts.length > 0 ? JSON.stringify({
    products: selectedProducts.map(p => p.id),
    minQty: 2,
    percentOff: parseInt(percentOff) || 10
  }) : "{}";

  return (
    <s-page heading="Volume Discount Configuration">
      <s-button slot="secondary-action" href="/app">
        Back to Home
      </s-button>

      {actionData?.success && (
        <s-banner status="success">
          <s-text>{actionData.message}</s-text>
        </s-banner>
      )}

      {actionData?.error && !actionData?.timeout && (
        <s-banner status="critical">
          <s-text>{actionData.error}</s-text>
        </s-banner>
      )}

      {actionData?.timeout && (
        <s-banner status="warning">
          <s-stack direction="block" gap="tight">
            <s-text variant="headingSm">Network Timeout</s-text>
            <s-text>Use the manual configuration method below (GraphiQL)</s-text>
          </s-stack>
        </s-banner>
      )}

      <s-section heading="Step 1: Select Products">
        <s-paragraph tone="subdued">
          Choose which products will qualify for the "Buy 2, get X% off" discount.
        </s-paragraph>
        <s-stack direction="block" gap="base">
          <s-button onClick={handleSelectProducts} variant="primary">
            {selectedProducts.length > 0 
              ? `${selectedProducts.length} Product(s) Selected` 
              : "Select Products"}
          </s-button>

          {selectedProducts.length > 0 && (
            <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
              <s-stack direction="block" gap="tight">
                <s-text variant="headingSm">Selected Products:</s-text>
                {selectedProducts.map((product, idx) => (
                  <s-text key={product.id}>
                    {idx + 1}. {product.title}
                  </s-text>
                ))}
              </s-stack>
            </s-box>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Step 2: Configure Discount">
        <s-stack direction="block" gap="base">
          <s-box>
            <s-text variant="headingSm">Minimum Quantity</s-text>
            <s-text tone="subdued">Fixed at 2 units for this assignment</s-text>
          </s-box>

          <s-box>
            <s-text variant="headingSm">Discount Percentage</s-text>
            <s-text tone="subdued">Enter a value between 1-80%</s-text>
            <input
              type="number"
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value)}
              min="1"
              max="80"
              style={{
                padding: "10px 15px",
                fontSize: "16px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                width: "150px",
                marginTop: "8px"
              }}
            />
            <s-text tone="subdued"> % off</s-text>
          </s-box>
        </s-stack>
      </s-section>

      {selectedProducts.length > 0 && (
        <s-section heading="Preview">
          <s-box padding="large" background="subdued" borderRadius="base">
            <s-stack direction="block" gap="base">
              <s-text variant="headingLg">🎉 Buy 2, get {percentOff}% off</s-text>
              <s-text tone="subdued">
                This discount will apply to {selectedProducts.length} product(s):
              </s-text>
              <s-text tone="subdued">
                {selectedProducts.map(p => p.title).join(", ")}
              </s-text>
            </s-stack>
          </s-box>
        </s-section>
      )}

      <s-section heading="Step 3: Save Configuration">
        <s-stack direction="block" gap="base">
          <s-button
            onClick={handleSave}
            variant="primary"
            {...(isSaving ? { loading: true } : {})}
            {...(selectedProducts.length === 0 ? { disabled: true } : {})}
          >
            Save Configuration
          </s-button>

          {(actionData?.timeout || !shopGid) && selectedProducts.length > 0 && (
            <s-box padding="base" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="tight">
                <s-text variant="headingSm">Manual Configuration (If save button fails)</s-text>
                <s-text>1. Open GraphiQL: http://localhost:3457</s-text>
                <s-text>2. Copy and run this mutation:</s-text>
                <pre style={{
                  background: "#f4f4f4",
                  padding: "12px",
                  borderRadius: "6px",
                  overflow: "auto",
                  fontSize: "12px"
                }}>
{`mutation {
  metafieldsSet(metafields: [{
    namespace: "volume_discount"
    key: "rules"
    type: "json"
    value: "${manualConfig.replace(/"/g, '\\"')}"
    ownerId: "${shopGid || 'YOUR_SHOP_GID'}"
  }]) {
    metafields { id value }
    userErrors { field message }
  }
}`}
                </pre>
              </s-stack>
            </s-box>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Next Steps After Saving">
        <s-stack direction="block" gap="tight">
          <s-text>1. The discount widget is already installed in your theme</s-text>
          <s-text>2. Go to a configured product page - you'll see "Buy 2, get X% off"</s-text>
          <s-text>3. Add 2 or more units to cart</s-text>
          <s-text>4. The discount will apply automatically at checkout</s-text>
          <s-text>5. Drop below 2 units - discount removes automatically</s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}
