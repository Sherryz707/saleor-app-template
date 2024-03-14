import { gql } from "urql";
import { SaleorAsyncWebhook, SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { PaymentGatewayInitializeSessionEventFragment, TransactionInitializeSessionEventFragment} from "../../../../generated/graphql";
import { saleorApp } from "../../../saleor-app";
import { createClient } from "../../../lib/create-graphq-client";

function convertUnixTimestampToISOString(timestampInSeconds) {
    const milliseconds = timestampInSeconds * 1000;
    return new Date(milliseconds).toISOString();
}
/**
 * Example payload of the webhook. It will be transformed with graphql-codegen to Typescript type: OrderCreatedWebhookPayloadFragment
 */
const TransactionInitializePayload = gql`fragment TransactionInitializeSessionAddress on Address {
  firstName
  lastName
  phone
  city
  streetAddress1
  streetAddress2
  postalCode
  countryArea
  companyName
  country {
    code
  }
}
fragment OrderOrCheckoutSourceObject on OrderOrCheckout {
  __typename
  ... on Checkout {
    id
    languageCode
    channel {
      id
      slug
    }
    userEmail: email
    billingAddress {
      ...TransactionInitializeSessionAddress
    }
    shippingAddress {
      ...TransactionInitializeSessionAddress
    }
    total: totalPrice {
      gross {
        currency
  amount
      }
    }
    ...OrderOrCheckoutLines
  }
  ... on Order {
    id
    languageCodeEnum
    userEmail
    channel {
      id
      slug
    }
    billingAddress {
      ...TransactionInitializeSessionAddress
    }
    shippingAddress {
      ...TransactionInitializeSessionAddress
    }
    total {
      gross {
        currency
  amount
      }
    }
    ...OrderOrCheckoutLines
  }
}

fragment OrderOrCheckoutLines on OrderOrCheckout {
  __typename
  ... on Checkout {
    channel {
      id
      slug
    }
    shippingPrice {
      gross {
         currency
  amount
      }
      net {
         currency
  amount
      }
      tax {
         currency
  amount
      }
    }
    deliveryMethod {
      __typename
      ... on ShippingMethod {
        id
        name
      }
    }
    lines {
      __typename
      id
      quantity
      totalPrice {
        gross {
           currency
  amount
        }
        net {
           currency
  amount
        }
        tax {
           currency
  amount
        }
      }
      checkoutVariant: variant {
        name
        sku
        product {
          name
          thumbnail {
            url
          }
          category {
            name
          }
        }
      }
    }
  }
  ... on Order {
    channel {
      id
      slug
    }
    shippingPrice {
      gross {
         currency
  amount
      }
      net {
         currency
  amount
      }
      tax {
         currency
  amount
      }
    }
    deliveryMethod {
      __typename
      ... on ShippingMethod {
        id
        name
      }
    }
    lines {
      __typename
      id
      quantity
      taxRate
      totalPrice {
        gross {
           currency
  amount
        }
        net {
           currency
  amount
        }
        tax {
           currency
  amount
        }
      }
      orderVariant: variant {
        name
        sku
        product {
          name
          thumbnail {
            url
          }
          category {
            name
          }
        }
      }
    }
  }
}
fragment TransactionInitializeSessionEvent on TransactionInitializeSession {
  __typename
  recipient {
   	id
  privateMetadata {
    key
    value
  }
  metadata {
    key
    value
  }
  }
  data
  merchantReference
  action {
    amount
    currency
    actionType
  }
  issuingPrincipal {
    ... on Node {
      id
    }
  }
  transaction {
    id
    pspReference
  }
  sourceObject {
    __typename
    ...OrderOrCheckoutSourceObject
  }
}`;

/**
 * Top-level webhook subscription query, that will be attached to the Manifest.
 * Saleor will use it to register webhook.
 */
const TransactionInitializeGraphqlSubscription = gql`
    ${TransactionInitializePayload}
subscription TransactionInitializeSession {
  event {
    ...TransactionInitializeSessionEvent
  }
}`

/**
 * Create abstract Webhook. It decorates handler and performs security checks under the hood.
 *
 * orderCreatedWebhook.getWebhookManifest() must be called in api/manifest too!
 */

export const TransactionInitializeWebhook = new SaleorSyncWebhook<TransactionInitializeSessionEventFragment>({
  name: "transaction-initialize-session",
  webhookPath: "api/webhooks/transaction-initialize-session",
  event: "TRANSACTION_INITIALIZE_SESSION",
  apl: saleorApp.apl,
  query: TransactionInitializeGraphqlSubscription,
});

/**
 * Export decorated Next.js handler, which adds extra context
 */
export default TransactionInitializeWebhook.createHandler((req, res, ctx) => {
  const {
    /**
     * Access payload from Saleor - defined above
     */
    payload,
    /**
     * Saleor event that triggers the webhook (here - ORDER_CREATED)
     */
    event,
    /**
     * App's URL
     */
    baseUrl,
    /**
     * Auth data (from APL) - contains token and saleorApiUrl that can be used to construct graphQL client
     */
    authData,
  } = ctx;

  /**
   * Perform logic based on Saleor Event payload
   */
  console.log(`transaction checking:`,payload);

  /**
   * Create GraphQL client to interact with Saleor API.
   */
  const client = createClient(authData.saleorApiUrl, async () => ({ token: authData.token }));
  
  /**
   * Now you can fetch additional data using urql.
   * https://formidable.com/open-source/urql/docs/api/core/#clientquery
   */
  
  // const data = await client.query().toPromise()

  /**
   * Inform Saleor that webhook was delivered properly.
   */
    return res.json({
    pspReference: payload.transaction.id.toString(),
    result: "AUTHORIZATION_SUCCESS",
    amount: payload.action.amount,
    time: convertUnixTimestampToISOString(Math.floor(Date.now() / 1000)),
    externalUrl: "http://localhost:3000/",
    message: "Successfull COD"
});

});

/**
 * Disable body parser for this endpoint, so signature can be verified
 */
export const config = {
  api: {
    bodyParser: false,
  },
};
