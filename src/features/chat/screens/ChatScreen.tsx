/**
 * =====================================================================
 *  ChatScreen – Unified Buyer–Seller Conversation
 * =====================================================================
 *
 *  This screen shows all messages inside a SINGLE conversation thread.
 *
 *  IMPORTANT:
 *  ---------------------------------------------------------------------
 *  We no longer use route params like:
 *      partnerName
 *      itemName
 *
 *  Because:
 *      1. They become outdated immediately when the user messages
 *         the same seller from another item.
 *
 *      2. All accurate metadata (partnerName, partnerInitials,
 *         itemName, etc.) MUST come from Firestore.
 *
 *  Therefore:
 *      ✔ We read threadId from navigation
 *      ✔ We fetch metadata from Firestore
 *      ✔ UI is ALWAYS correct and synced
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Feather as Icon } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useBlockingStatus } from "../../../hooks/useBlockingStatus";
import { usePullToRefresh } from "../../../hooks/usePullToRefresh";
import { COLORS } from "../../../theme/colors";
import { useAuth } from "../../auth/AuthProvider";

import {
  clearUnread,
  subscribeToMessages,
  toggleReaction,
  removeReaction,
} from "../api";

import { db, doc, getDoc } from "../../../lib/firebase";

/* ======================================================================
 *  MAIN CHAT SCREEN
 * ====================================================================== */
export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // threadId is the ONLY navigation param
  const { threadId } = useLocalSearchParams() as { threadId: string };

  // Header metadata (loaded from Firestore)
  const [partnerName, setPartnerName] = useState("User");
  const [partnerInitials, setPartnerInitials] = useState("U");
  const [itemName, setItemName] = useState("Item");
  const [partnerId, setPartnerId] = useState("");

  // Message state
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  // Reaction picker
  const [activeReactionTarget, setActiveReactionTarget] =
      useState<string | null>(null);

  /* ====================================================================
   * 1. Load thread header metadata
   * ==================================================================== */
  useEffect(() => {
    if (!user || !threadId) return;

    const loadThreadInfo = async () => {
      const ref = doc(db, "chats", threadId);
      const snap = await getDoc(ref);

      if (!snap.exists()) return;

      const data = snap.data();

      const otherId = data.participants.find((p: string) => p !== user.uid);

      const pName =
          otherId === data.sellerId ? data.sellerName : data.buyerName;

      const pInitials =
          otherId === data.sellerId ? data.sellerInitials : data.buyerInitials;

      setPartnerName(pName || "User");
      setPartnerInitials((pInitials || "U").toUpperCase());
      setItemName(data.itemName || "Item");
      setPartnerId(otherId || "");
    };

    loadThreadInfo();
  }, [threadId, user]);

  /* ====================================================================
   * 2. Subscribe to message list
   * ==================================================================== */
  useEffect(() => {
    if (!user || !threadId) return;

    clearUnread(threadId, user.uid);

    const unsub = subscribeToMessages(threadId, (msgs) => {
      const formatted = msgs.map((m: any) => ({
        id: m.id,
        text: m.text,
        sender: m.senderId === user.uid ? "me" : "other",
        reactions: m.reactions || {},
        raw: m,
        time: m.createdAt?.toDate
            ? m.createdAt.toDate().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
            : "",
      }));

      setMessages(formatted);
    });

    return () => unsub();
  }, [threadId, user]);

  /* ====================================================================
   * Pull-to-refresh (visual only)
   * ==================================================================== */
  const handleRefreshMessages = useCallback(() => {
    return new Promise<void>((resolve) => setTimeout(resolve, 300));
  }, []);

  const messageRefresh = usePullToRefresh({
    onRefresh: handleRefreshMessages,
    indicatorOffset: 4,
  });

  const { isBlocked, blockedByOther, loading: blockLoading } =
      useBlockingStatus(user?.uid, partnerId);

  const messagingDisabled = isBlocked || blockedByOther;

  /* ====================================================================
   * Reaction Handler
   * ==================================================================== */
  const handleReaction = async (
      msgId: string,
      current: "like" | "love" | "laugh" | null,
      chosen: "like" | "love" | "laugh"
  ) => {
    if (!user || !threadId) return;

    setActiveReactionTarget(null);

    if (current === chosen) {
      await removeReaction(threadId, msgId, user.uid);
      return;
    }

    await toggleReaction(threadId, msgId, user.uid, chosen);
  };

  /* ====================================================================
   * Send a message
   * ==================================================================== */
  const sendMessageToFirestore = async () => {
    if (!message.trim() || !threadId || !user || !partnerId) return;

    if (messagingDisabled) {
      Alert.alert(
          "Messaging blocked",
          blockedByOther
              ? "This user has blocked you from messaging them."
              : "Unblock this user to resume messaging."
      );
      return;
    }

    const { sendMessage: sendMessageAPI } = await import("../api");

    try {
      await sendMessageAPI(threadId, user.uid, message.trim(), partnerId);
      setMessage("");
    } catch (err: any) {
      Alert.alert("Unable to send message", err?.message);
    }
  };

  /* ====================================================================
   * FIXED — Navigation to Block User Screen
   * ==================================================================== */
  const openBlockSettings = () => {
    if (!partnerId) return;

    // ⭐ FIX: string navigation avoids TS route errors
    router.push(`/block-user?userId=${partnerId}&name=${partnerName}` as any);
  };

  /* ====================================================================
   * Render a chat bubble + reactions
   * ==================================================================== */
  const renderMessage = ({ item }: any) => {
    const isMine = item.sender === "me";

    const rawReaction = item.reactions?.[user?.uid ?? ""] ?? null;
    const typedUserReaction =
        rawReaction === "like" || rawReaction === "love" || rawReaction === "laugh"
            ? rawReaction
            : null;

    return (
        <View
            style={[
              styles.messageContainer,
              isMine ? styles.myMessageContainer : styles.otherMessageContainer,
            ]}
        >
          {/* Long press to open reactions */}
          <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => setActiveReactionTarget(item.id)}
          >
            <View
                style={[
                  styles.messageBubble,
                  isMine ? styles.myMessage : styles.otherMessage,
                ]}
            >
              <Text
                  style={[styles.messageText, isMine && styles.myMessageText]}
              >
                {item.text}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.timeText}>{item.time}</Text>

          {/* Reactions row */}
          {Object.keys(item.reactions).length > 0 && (
              <View style={styles.reactionRow}>
                {Object.entries(item.reactions).map(([uid, r]) => {
                  if (!r) return null;
                  const emoji = r === "like" ? "👍" : r === "love" ? "❤️" : "😂";
                  return (
                      <View key={uid} style={styles.reactionBubble}>
                        <Text style={styles.reactionText}>{emoji}</Text>
                      </View>
                  );
                })}
              </View>
          )}

          {/* Reaction picker */}
          {activeReactionTarget === item.id && (
              <View style={styles.reactionPicker}>
                <TouchableOpacity
                    onPress={() =>
                        handleReaction(item.id, typedUserReaction, "like")
                    }
                >
                  <Text style={styles.reactionPickerEmoji}>👍</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() =>
                        handleReaction(item.id, typedUserReaction, "love")
                    }
                >
                  <Text style={styles.reactionPickerEmoji}>❤️</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() =>
                        handleReaction(item.id, typedUserReaction, "laugh")
                    }
                >
                  <Text style={styles.reactionPickerEmoji}>😂</Text>
                </TouchableOpacity>
              </View>
          )}
        </View>
    );
  };

  /* ====================================================================
   * SCREEN RENDER
   * ==================================================================== */
  return (
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
          keyboardVerticalOffset={90}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{partnerInitials}</Text>
            </View>
            <View>
              <Text style={styles.partnerName}>{partnerName}</Text>
              <Text style={styles.itemName}>📦 {itemName}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={openBlockSettings}>
            <Icon name="more-vertical" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {(messagingDisabled || blockLoading) && (
            <View style={styles.blockNotice}>
              <Icon name="slash" size={16} color={COLORS.primary} />
              <Text style={styles.blockNoticeText}>
                {blockLoading
                    ? "Checking block status..."
                    : blockedByOther
                        ? "You cannot send messages to this user."
                        : "You blocked this user. Unblock in settings to resume chatting."}
              </Text>
            </View>
        )}

        {/* MESSAGE LIST */}
        <View style={styles.messagesWrapper}>
          {messageRefresh.indicator}

          {messagingDisabled ? (
              <View style={styles.blockedMessages}>
                <Icon name="slash" size={24} color={COLORS.primary} />
                <Text style={styles.blockNoticeText}>
                  Messages are hidden because{" "}
                  {blockedByOther ? "this user blocked you" : "you blocked this user"}.
                </Text>
              </View>
          ) : (
              <Animated.FlatList
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={(item) => item.id.toString()}
                  style={messageRefresh.listStyle}
                  contentContainerStyle={styles.messagesContainer}
                  onScroll={messageRefresh.onScroll}
                  onScrollEndDrag={messageRefresh.onRelease}
                  onMomentumScrollEnd={messageRefresh.onRelease}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}
              />
          )}
        </View>

        {/* INPUT BAR */}
        <View style={styles.inputContainer}>
          <TextInput
              style={[styles.input, messagingDisabled && styles.inputDisabled]}
              placeholder="Type a message..."
              value={message}
              onChangeText={setMessage}
              multiline
              editable={!messagingDisabled}
          />

          <TouchableOpacity
              style={[styles.sendButton, messagingDisabled && styles.sendButtonDisabled]}
              onPress={sendMessageToFirestore}
              disabled={messagingDisabled}
          >
            <Icon name="send" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
  );
}

/* ======================================================================
 *  STYLES
 * ====================================================================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* HEADER */
  header: {
    backgroundColor: COLORS.white,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: COLORS.white,
    fontWeight: "600",
  },

  partnerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  itemName: {
    fontSize: 12,
    color: "#6B7280",
  },

  /* MESSAGE LIST */
  messagesWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },

  blockedMessages: {
    alignItems: "center",
    gap: 8,
    padding: 24,
  },

  /* CHAT BUBBLES */
  messageContainer: {
    marginBottom: 16,
    maxWidth: "75%",
  },

  myMessageContainer: {
    alignSelf: "flex-end",
  },

  otherMessageContainer: {
    alignSelf: "flex-start",
  },

  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },

  myMessage: {
    backgroundColor: COLORS.primary,
  },

  otherMessage: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  messageText: {
    fontSize: 14,
    color: "#374151",
  },

  myMessageText: {
    color: COLORS.white,
  },

  timeText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },

  /* REACTIONS */
  reactionRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },

  reactionBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  reactionText: {
    fontSize: 14,
  },

  reactionPicker: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "flex-start",
  },

  reactionPickerEmoji: {
    fontSize: 22,
  },

  /* INPUT BAR */
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "center",
    gap: 12,
  },

  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },

  inputDisabled: {
    opacity: 0.6,
  },

  sendButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  sendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },

  blockNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  blockNoticeText: {
    color: "#1F2937",
    flex: 1,
  },
});