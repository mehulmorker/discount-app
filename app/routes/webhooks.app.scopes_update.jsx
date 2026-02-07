/** prisma version */ 

// import { authenticate } from "../shopify.server";
// import db from "../db.server";

// export const action = async ({ request }) => {
//   const { payload, session, topic, shop } = await authenticate.webhook(request);

//   console.log(`Received ${topic} webhook for ${shop}`);
//   const current = payload.current;

//   if (session) {
//     await db.session.update({
//       where: {
//         id: session.id,
//       },
//       data: {
//         scope: current.toString(),
//       },
//     });
//   }

//   return new Response();
// };

/** mongodb version */ 

import { authenticate, sessionStorage } from "../shopify.server";

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;

  if (session) {
    session.scope = current.toString();
    await sessionStorage.storeSession(session);
  }

  return new Response();
};
