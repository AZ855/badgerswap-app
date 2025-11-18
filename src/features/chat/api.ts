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
import { auth, db } from "../../lib/firebase";

// Thread ID generator
export function makeThreadId(itemId: string, buyerId: string, sellerId: string) {
    return `${itemId}_${buyerId}_${sellerId}`;
}

// Create or fetch thread
export async function getOrCreateThread({
                                            itemId,
                                            itemName,
                                            sellerId,
                                            buyerId,
                                            partnerName,
                                            partnerInitials,
                                        }) {
    const threadId = makeThreadId(itemId, buyerId, sellerId);
    const ref = doc(db, "chats", threadId);

    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            threadId,
            itemId,
            itemName,
            participants: [buyerId, sellerId],
            partnerName,
            partnerInitials,
            lastMessage: "",
            timestamp: serverTimestamp(),
            unread: {
                [buyerId]: 0,
                [sellerId]: 0,
            },
        });
    }

    return threadId;
}

// Send message
export async function sendMessage(threadId: string, senderId: string, text: string) {
    const threadRef = doc(db, "chats", threadId);
    const messagesRef = collection(threadRef, "messages");

    await addDoc(messagesRef, {
        senderId,
        text,
        createdAt: serverTimestamp(),
    });

    // Update thread metadata
    const snap = await getDoc(threadRef);
    const data = snap.data();
    const other = data.participants.find((p: string) => p !== senderId);

    await updateDoc(threadRef, {
        lastMessage: text,
        timestamp: serverTimestamp(),
        [`unread.${other}`]: (data.unread?.[other] || 0) + 1,
    });
}

// Real-time listener for messages
export function subscribeToMessages(threadId: string, callback: (msgs: any[]) => void) {
    const threadRef = doc(db, "chats", threadId);
    const messagesRef = collection(threadRef, "messages");

    const q = query(messagesRef, orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
        callback(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
    });
}

// Real-time listener for conversations
export function subscribeToThreads(userId: string, callback: (threads: any[]) => void) {
    const threadsRef = collection(db, "chats");
    const q = query(threadsRef, where("participants", "array-contains", userId));

    return onSnapshot(q, (snap) => {
        callback(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
    });
}

// Clear unread count
export async function clearUnread(threadId: string, userId: string) {
    const ref = doc(db, "chats", threadId);
    await updateDoc(ref, {
        [`unread.${userId}`]: 0,
    });
}