/**
 * =====================================================================
 *  BadgerSwap Chat API
 * =====================================================================
 *
 *  This file contains ALL Firestore chat logic used in the application.
 */

// ---------------------------------------------------------------------
// Firestore imports & setup
// ---------------------------------------------------------------------
import {
    addDoc,
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "../../lib/firebase";

import { db } from "../../lib/firebase";

// ---------------------------------------------------------------------
// Type Definitions (added to remove TS errors — NO logic changes)
// ---------------------------------------------------------------------
export interface ThreadContext {
    itemId: string;
    itemName: string;
    sellerId: string;
    buyerId: string;
    sellerName: string;
    sellerInitials: string;
    buyerName: string;
    buyerInitials: string;
}

// All fields optional → fixes TS2322 strict typing error
export interface ChatMessage {
    id?: string;
    senderId?: string;
    text?: string;
    createdAt?: any; // Firestore timestamp
}

// Thread shape from Firestore
export interface ChatThread {
    id?: string;
    threadId: string;
    itemId: string;
    itemName: string;
    participants: string[];
    buyerId: string;
    sellerId: string;
    buyerName: string;
    sellerName: string;
    buyerInitials: string;
    sellerInitials: string;
    lastMessage: string;
    timestamp: any;
    unread: Record<string, number>;
    partnerName?: string;
    partnerInitials?: string;
}

// =====================================================================
// 1. THREAD ID GENERATOR
// =====================================================================
export function makeThreadId(buyerId: string, sellerId: string) {
    const sortedA = buyerId < sellerId ? buyerId : sellerId;
    const sortedB = buyerId < sellerId ? sellerId : buyerId;
    const threadId = `${sortedA}_${sortedB}`;
    return threadId;
}

// =====================================================================
// 2. CREATE OR UPDATE A THREAD
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
                                        }: ThreadContext) {

    const threadId = makeThreadId(buyerId, sellerId);
    const ref = doc(db, "chats", threadId);
    const snap = await getDoc(ref);
    const exists = snap.exists();

    if (!exists) {
        await setDoc(ref, {
            threadId,
            itemId,
            itemName,
            participants: [buyerId, sellerId],
            buyerId,
            sellerId,
            buyerName,
            sellerName,
            buyerInitials,
            sellerInitials,
            lastMessage: "",
            timestamp: serverTimestamp(),
            unread: {
                [buyerId]: 0,
                [sellerId]: 0,
            },
        });
    } else {
        await updateDoc(ref, {
            itemId,
            itemName,
            buyerName,
            sellerName,
            buyerInitials,
            sellerInitials,
            timestamp: serverTimestamp(),
        });
    }

    return threadId;
}

// =====================================================================
// 3. SEND MESSAGE
// =====================================================================
export async function sendMessage(
    threadId: string,
    senderId: string,
    text: string
) {

    if (!text.trim()) return;

    const threadRef = doc(db, "chats", threadId);
    const messagesRef = collection(threadRef, "messages");

    await addDoc(messagesRef, {
        senderId,
        text,
        createdAt: serverTimestamp(),
    });

    const snap = await getDoc(threadRef);
    const data = snap.data();

    if (!data) return;

    const otherUser = data.participants.find(
        (p: string) => p !== senderId
    );

    await updateDoc(threadRef, {
        lastMessage: text,
        timestamp: serverTimestamp(),
        [`unread.${otherUser}`]: (data.unread?.[otherUser] || 0) + 1,
    });
}

// =====================================================================
// 4. SUBSCRIBE TO MESSAGES
// =====================================================================
export function subscribeToMessages(
    threadId: string,
    callback: (msgs: ChatMessage[]) => void
) {

    const threadRef = doc(db, "chats", threadId);
    const messagesRef = collection(threadRef, "messages");

    const q = query(messagesRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snap) => {

        const messages: ChatMessage[] = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));

        callback(messages);
    });
}

// =====================================================================
// 5. SUBSCRIBE TO ALL THREADS FOR A USER
// =====================================================================
export function subscribeToThreads(
    userId: string,
    callback: (threads: ChatThread[]) => void
) {

    const threadsRef = collection(db, "chats");

    const q = query(
        threadsRef,
        where("participants", "array-contains", userId)
    );

    return onSnapshot(q, (snap) => {

        const threads: ChatThread[] = snap.docs.map((d) => {
            const data = d.data() as ChatThread;
            const participants = data.participants || [];

            const otherId = participants.find(
                (p: string) => p !== userId
            );

            const partnerName =
                otherId === data.sellerId
                    ? data.sellerName
                    : data.buyerName;

            const partnerInitials =
                otherId === data.sellerId
                    ? data.sellerInitials
                    : data.buyerInitials;

            return {
                id: d.id,
                ...data,
                partnerName,
                partnerInitials,
            };
        });

        callback(threads);
    });
}

// =====================================================================
// 6. CLEAR UNREAD COUNT
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