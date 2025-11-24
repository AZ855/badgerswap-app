/**
 * =====================================================================
 *  BadgerSwap Chat API
 * =====================================================================
 *
 *  This file contains ALL Firestore chat logic used in the application.
 *  It handles:
 *
 *    1. Generating a stable buyer–seller thread ID
 *    2. Creating or updating a conversation thread
 *    3. Sending messages to Firestore
 *    4. Listening to live messages in a thread
 *    5. Listening to all threads for a user
 *    6. Clearing unread message counts
 *
 *  IMPORTANT:
 *  ---------------------------------------------------------------------
 *  BadgerSwap now uses **ONE conversation per buyer–seller pair**.
 *  This means:
 *
 *    - If a buyer messages the same seller from different items,
 *      they STILL share one conversation.
 *
 *    - The "active item" in the conversation updates to the most
 *      recent item the user clicked "Message Seller" from.
 *
 *  This is the same behavior used by Facebook Marketplace and OfferUp.
 *
 */

// ---------------------------------------------------------------------
// Firestore imports & setup
// ---------------------------------------------------------------------
import {
    collection,
    doc,
    getDoc,
    setDoc,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
} from "../../lib/firebase";

import { db } from "../../lib/firebase";


// =====================================================================
// 1. THREAD ID GENERATOR
// =====================================================================
//
//  Old behavior:
//     makeThreadId(itemId, buyerId, sellerId)
//
//  New behavior:
//     ONE CHAT THREAD per buyer + seller pair.
//     The itemId no longer determines the thread.
//
//  Why sort IDs?
//     To ensure:
//        A + B  → same as  B + A
//     So the identity of the thread is stable.
//
// =====================================================================
export function makeThreadId(buyerId: string, sellerId: string) {

    // We SORT the two IDs alphabetically to guarantee consistency.
    const sortedA = buyerId < sellerId ? buyerId : sellerId;
    const sortedB = buyerId < sellerId ? sellerId : buyerId;

    // Construct the stable thread ID
    const threadId = `${sortedA}_${sortedB}`;

    return threadId;
}



// =====================================================================
// 2. CREATE OR UPDATE A THREAD
// =====================================================================
//
//  Behavior:
//
//      - If the thread does *not* exist → Create a new document.
//
//      - If the thread *already exists* → Update itemId + itemName +
//        profile/name fields so the UI always reflects the latest "context"
//        (the latest item).
//
//  NOTE:
//      This lets users message a seller from multiple items while
//      keeping only ONE shared conversation thread.
//
// =====================================================================
export async function getOrCreateThread({
                                            itemId,
                                            itemName,
                                            sellerId,
                                            buyerId,
                                            sellerName,
                                            sellerInitials,
                                            buyerName,
                                            buyerInitials,
                                        }) {

    // Generate the buyer–seller based thread ID
    const threadId = makeThreadId(buyerId, sellerId);

    // Firestore reference
    const ref = doc(db, "chats", threadId);

    // Check Firestore for existence
    const snap = await getDoc(ref);
    const exists = snap.exists();



    // -----------------------------------------------------------
    // CASE 1: Thread does NOT exist → CREATE NEW THREAD DOCUMENT
    // -----------------------------------------------------------
    if (!exists) {

        await setDoc(ref, {

            // Core thread identity
            threadId,

            // Store the item that generated this conversation
            itemId,
            itemName,

            // Participants (always 2)
            participants: [buyerId, sellerId],

            // Store BOTH user identities for convenience
            buyerId,
            sellerId,
            buyerName,
            sellerName,
            buyerInitials,
            sellerInitials,

            // Chat metadata
            lastMessage: "",
            timestamp: serverTimestamp(),

            // Unread message counts per user
            unread: {
                [buyerId]: 0,
                [sellerId]: 0,
            },
        });
    }



        // -----------------------------------------------------------
        // CASE 2: Thread EXISTS → UPDATE ITEM CONTEXT
    // -----------------------------------------------------------
    else {

        const data = snap.data() || {};

        // Update only contextual info (latest item clicked)
        await updateDoc(ref, {

            itemId,
            itemName,

            // Update names in case user updated profile info
            buyerName,
            sellerName,
            buyerInitials,
            sellerInitials,

            // Bump timestamp to move thread to top of list
            timestamp: serverTimestamp(),
        });
    }



    return threadId;
}



// =====================================================================
// 3. SEND MESSAGE
// =====================================================================
//
//  Responsibilities:
//
//      - Add a message to /messages subcollection
//      - Update parent thread's lastMessage
//      - Increase unread count for *the other participant*
//
// =====================================================================
export async function sendMessage(
    threadId: string,
    senderId: string,
    text: string
) {

    if (!text.trim()) return; // no empty messages

    const threadRef = doc(db, "chats", threadId);
    const messagesRef = collection(threadRef, "messages");



    // -----------------------------------------------------------
    // 1. Add message document
    // -----------------------------------------------------------
    await addDoc(messagesRef, {
        senderId,
        text,
        createdAt: serverTimestamp(),
    });



    // -----------------------------------------------------------
    // 2. Update parent thread metadata
    // -----------------------------------------------------------
    const snap = await getDoc(threadRef);
    const data = snap.data();

    if (!data) return;

    // Find the other participant
    const otherUser = data.participants.find(
        (p: string) => p !== senderId
    );

    await updateDoc(threadRef, {

        lastMessage: text,
        timestamp: serverTimestamp(),

        // Unread count increments ONLY for the other user
        [`unread.${otherUser}`]: (data.unread?.[otherUser] || 0) + 1,
    });
}



// =====================================================================
// 4. SUBSCRIBE TO MESSAGES
// =====================================================================
//
//  Live-updates the UI with all messages in this thread.
//  Messages are sorted oldest → newest (ASC).
//
// =====================================================================
export function subscribeToMessages(
    threadId: string,
    callback: (msgs: any[]) => void
) {

    const threadRef = doc(db, "chats", threadId);
    const messagesRef = collection(threadRef, "messages");

    // Query sorted by timestamp
    const q = query(messagesRef, orderBy("createdAt", "asc"));


    return onSnapshot(q, (snap) => {

        const messages = snap.docs.map((d) => ({
            id   : d.id,
            ...d.data(),
        }));

        callback(messages);
    });
}



// =====================================================================
// 5. SUBSCRIBE TO ALL THREADS FOR A USER
// =====================================================================
//
//  This drives the ChatListScreen UI.
//
//  It finds all chat threads that include this user, then derives:
//
//      partnerName      – the name of the other participant
//      partnerInitials  – avatar display
//
//  Thread structure:
//      chats / {threadId}
//         - participants: [buyerId, sellerId]
//         - itemId
//         - itemName
//
// =====================================================================
export function subscribeToThreads(
    userId: string,
    callback: (threads: any[]) => void
) {

    const threadsRef = collection(db, "chats");

    // Firestore query: include userId in participants array
    const q = query(
        threadsRef,
        where("participants", "array-contains", userId)
    );



    return onSnapshot(q, (snap) => {

        const threads = snap.docs.map((d) => {

            const data = d.data();
            const participants = data.participants || [];

            // Identify the OTHER participant
            const otherId = participants.find(
                (p: string) => p !== userId
            );

            // Compute names/initials depending on who "other" is
            const partnerName =
                otherId === data.sellerId
                    ? data.sellerName
                    : data.buyerName;

            const partnerInitials =
                otherId === data.sellerId
                    ? data.sellerInitials
                    : data.buyerInitials;


            return {
                id: d.id,        // threadId
                ...data,         // keep all Firestore fields
                partnerName,     // computed
                partnerInitials, // computed
            };
        });


        callback(threads);
    });
}



// =====================================================================
// 6. CLEAR UNREAD COUNT
// =====================================================================
//
//  This is called when the user enters the ChatScreen.
//
// =====================================================================
export async function clearUnread(
    threadId: string,
    userId: string
) {

    const ref = doc(db, "chats", threadId);

    await updateDoc(ref, {
        [`unread.${userId}`]: 0,
    });
}



// =====================================================================
// END OF FILE — Chat API
// =====================================================================
