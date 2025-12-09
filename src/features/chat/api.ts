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
import { increment } from "firebase/firestore";
import { uploadImageAsync } from "../posting/cloudinary";

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

export interface ChatMessage {
    id?: string;
    senderId?: string;
    text?: string;
    createdAt?: any;

    photoUrl?: string;
    reactions?: Record<string, string | null>;
    withdrawn?: boolean;

    type?: "offer";
    amount?: number;
    offerStatus?: "pending" | "accepted" | "declined";   // ⭐ NEW
}

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

export function makeThreadId(buyerId: string, sellerId: string) {
    const a = buyerId < sellerId ? buyerId : sellerId;
    const b = buyerId < sellerId ? sellerId : buyerId;
    return `${a}_${b}`;
}

export async function getOrCreateThread(ctx: ThreadContext) {
    const { itemId, itemName, sellerId, buyerId } = ctx;

    const baseId = makeThreadId(buyerId, sellerId);
    const threadId = `${baseId}_${itemId}`;
    const ref = doc(db, "chats", threadId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            threadId,
            participants: [buyerId, sellerId],
            ...ctx,
            lastMessage: "",
            timestamp: serverTimestamp(),
            unread: { [buyerId]: 0, [sellerId]: 0 },
        });

        try {
            const listingRef = doc(db, "listings", itemId);
            await updateDoc(listingRef, { messagesCount: increment(1) });
        } catch {}
    } else {
        await updateDoc(ref, {
            itemId,
            itemName,
            timestamp: serverTimestamp(),
        });
    }

    return threadId;
}

export async function sendMessage(threadId: string, senderId: string, text: string, recipientId?: string) {
    if (!text.trim()) return;

    const t = doc(db, "chats", threadId);
    const snap = await getDoc(t);
    const data = snap.data();
    if (!data) return;

    const other = recipientId || data.participants.find((p: string) => p !== senderId);
    if (!other) return;

    const messagesRef = collection(t, "messages");

    await addDoc(messagesRef, {
        senderId,
        text,
        createdAt: serverTimestamp(),
        withdrawn: false,
    });

    await updateDoc(t, {
        lastMessage: text,
        timestamp: serverTimestamp(),
        [`unread.${other}`]: (data.unread?.[other] || 0) + 1,
    });
}

export async function sendPhoto(threadId: string, senderId: string, localUri: string, recipientId?: string) {
    if (!localUri) return;

    const t = doc(db, "chats", threadId);
    const snap = await getDoc(t);
    const data = snap.data();
    if (!data) return;

    const other = recipientId || data.participants.find((p: string) => p !== senderId);
    if (!other) return;

    const downloadUrl = await uploadImageAsync(localUri);
    const messagesRef = collection(t, "messages");

    await addDoc(messagesRef, {
        senderId,
        photoUrl: downloadUrl,
        createdAt: serverTimestamp(),
        withdrawn: false,
    });

    await updateDoc(t, {
        lastMessage: "[Photo]",
        timestamp: serverTimestamp(),
        [`unread.${other}`]: (data.unread?.[other] || 0) + 1,
    });
}

/* =====================================================================
   OFFER: SEND
===================================================================== */
export async function sendOffer(threadId: string, senderId: string, amount: number, recipientId?: string) {
    const t = doc(db, "chats", threadId);
    const snap = await getDoc(t);
    const data = snap.data();
    if (!data) return;

    const other = recipientId || data.participants.find((p: string) => p !== senderId);
    if (!other) return;

    const messagesRef = collection(t, "messages");

    await addDoc(messagesRef, {
        senderId,
        type: "offer",
        amount,
        offerStatus: "pending",     // ⭐ NEW
        createdAt: serverTimestamp(),
        withdrawn: false,
    });

    await updateDoc(t, {
        lastMessage: `Offer: $${amount}`,
        timestamp: serverTimestamp(),
        [`unread.${other}`]: (data.unread?.[other] || 0) + 1,
    });
}

/* =====================================================================
   OFFER: ACCEPT  (NEW)
   Must update BOTH:
   - specific offer message
   - thread's acceptedOffer metadata
===================================================================== */
export async function acceptOffer(
    threadId: string,
    messageId: string,
    buyerId: string,
    amount: number
) {
    const msgRef = doc(db, "chats", threadId, "messages", messageId);
    const threadRef = doc(db, "chats", threadId);

    // update offer message (lock it)
    await updateDoc(msgRef, {
        offerStatus: "accepted",
    });

    // update thread metadata (for mark-as-sold)
    await updateDoc(threadRef, {
        acceptedOffer: {
            buyerId,
            amount,
            acceptedAt: serverTimestamp(),
        },
        lastMessage: `Offer accepted ($${amount})`,
        timestamp: serverTimestamp(),
    });
}

/* =====================================================================
   OFFER: DECLINE (NEW)
===================================================================== */
export async function declineOffer(threadId: string, messageId: string) {
    const msgRef = doc(db, "chats", threadId, "messages", messageId);

    await updateDoc(msgRef, {
        offerStatus: "declined",
    });
}

export function subscribeToMessages(threadId: string, callback: (msgs: ChatMessage[]) => void) {
    const t = doc(db, "chats", threadId);
    const messagesRef = collection(t, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    return onSnapshot(q, (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(msgs as ChatMessage[]);
    });
}

export function subscribeToThreads(userId: string, callback: (threads: ChatThread[]) => void) {
    const threadsRef = collection(db, "chats");

    const q = query(threadsRef, where("participants", "array-contains", userId));

    return onSnapshot(q, (snap) => {
        const threads = snap.docs.map((d) => {
            const data = d.data() as ChatThread;
            const other = data.participants.find((p: string) => p !== userId);

            const partnerName = other === data.sellerId ? data.sellerName : data.buyerName;
            const partnerInitials = other === data.sellerId ? data.sellerInitials : data.buyerInitials;

            let preview = data.lastMessage || "";

            const isEmpty =
                preview === "Message withdrawn" &&
                Object.values(data.unread || {}).every((x) => x === 0);

            if (isEmpty) preview = "";

            return { id: d.id, ...data, lastMessage: preview, partnerName, partnerInitials };
        });

        callback(threads);
    });
}

export async function clearUnread(threadId: string, userId: string) {
    const ref = doc(db, "chats", threadId);
    await updateDoc(ref, { [`unread.${userId}`]: 0 });
}

export async function toggleReaction(threadId: string, messageId: string, userId: string, reaction: any) {
    const msgRef = doc(db, "chats", threadId, "messages", messageId);
    await updateDoc(msgRef, { [`reactions.${userId}`]: reaction });
}

export async function removeReaction(threadId: string, messageId: string, userId: string) {
    const msgRef = doc(db, "chats", threadId, "messages", messageId);
    await updateDoc(msgRef, { [`reactions.${userId}`]: null });
}

export function canWithdrawMessage(createdAt: any) {
    if (!createdAt) return false;
    try {
        const ts = createdAt.toMillis ? createdAt.toMillis() : createdAt;
        return Date.now() - ts <= 180000;
    } catch {
        return false;
    }
}

export async function withdrawMessage(threadId: string, messageId: string) {
    const msgRef = doc(db, "chats", threadId, "messages", messageId);
    const threadRef = doc(db, "chats", threadId);

    await updateDoc(msgRef, {
        withdrawn: true,
        text: "",
        photoUrl: "",
    });

    await updateDoc(threadRef, {
        lastMessage: "Message withdrawn",
    });
}