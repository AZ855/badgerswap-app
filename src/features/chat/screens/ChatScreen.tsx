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
  Image,
} from "react-native";

import { Feather as Icon } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  withdrawMessage,
  canWithdrawMessage,
  sendOffer,
  acceptOffer,
  declineOffer,   // ⭐ FIXED: import declineOffer
} from "../api";

import { db, doc, getDoc } from "../../../lib/firebase";
import * as ImagePicker from "expo-image-picker";
import { sendPhoto } from "../api";

export default function ChatScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { threadId } = useLocalSearchParams() as { threadId: string };

  const [partnerName, setPartnerName] = useState("User");
  const [partnerInitials, setPartnerInitials] = useState("U");
  const [itemName, setItemName] = useState("Item");
  const [partnerId, setPartnerId] = useState("");
  const [itemId, setItemId] = useState("");

  const [buyerId, setBuyerId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const isSeller = user?.uid === sellerId;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [activeReactionTarget, setActiveReactionTarget] =
      useState<string | null>(null);

  /* Load header metadata */
  useEffect(() => {
    if (!user || !threadId) return;

    const load = async () => {
      const snap = await getDoc(doc(db, "chats", threadId));
      if (!snap.exists()) return;
      const d = snap.data();

      setBuyerId(d.buyerId);
      setSellerId(d.sellerId);

      const self = user.uid;
      const other = d.participants.find((p: string) => p !== self);

      const pName = self === d.buyerId ? d.sellerName : d.buyerName;
      const pInit = self === d.buyerId ? d.sellerInitials : d.buyerInitials;

      setPartnerName(pName || "User");
      setPartnerInitials((pInit || "U").toUpperCase());
      setItemName(d.itemName || "Item");
      setPartnerId(other || "");
      setItemId(d.itemId || "");
    };

    load();
  }, [threadId, user]);

  /* Subscribe to messages */
  useEffect(() => {
    if (!user || !threadId) return;

    clearUnread(threadId, user.uid);

    const unsub = subscribeToMessages(threadId, (msgs) => {
      const mapped = msgs.map((m: any) => ({
        id: m.id,
        text: m.text,
        photoUrl: m.photoUrl || null,
        withdrawn: m.withdrawn || false,
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
      setMessages(mapped);
    });

    return () => unsub();
  }, [threadId, user]);

  const messageRefresh = usePullToRefresh({
    onRefresh: () => new Promise((r) => setTimeout(r, 300)),
    indicatorOffset: 4,
  });

  const { isBlocked, blockedByOther, loading: blockLoading } =
      useBlockingStatus(user?.uid, partnerId);

  const messagingDisabled = isBlocked || blockedByOther;

  /* Reaction Handler */
  const handleReaction = async (msgId: string, current: any, chosen: any) => {
    if (!user || !threadId) return;
    const msg = messages.find((m) => m.id === msgId);
    if (msg?.withdrawn) return;
    setActiveReactionTarget(null);

    if (current === chosen)
      return removeReaction(threadId, msgId, user.uid);

    toggleReaction(threadId, msgId, user.uid, chosen);
  };

  /* Send text message */
  const sendMessageToFirestore = async () => {
    if (!message.trim() || !user || messagingDisabled) return;

    const { sendMessage } = await import("../api");
    try {
      await sendMessage(threadId, user.uid, message.trim(), partnerId);
      setMessage("");
    } catch (e: any) {
      Alert.alert("Unable to send message", e?.message);
    }
  };

  /* Send photo */
  const pickAndSendPhoto = async () => {
    if (messagingDisabled) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;
      if (uri) await sendPhoto(threadId, user!.uid, uri, partnerId);
    }
  };

  /* Withdraw message */
  const openWithdrawMenu = (msg: any) => {
    if (msg.sender !== "me") return;
    if (!canWithdrawMessage(msg.raw?.createdAt))
      return Alert.alert("Cannot withdraw", "Too late.");

    Alert.alert("Message options", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: () => withdrawMessage(threadId, msg.id),
      },
    ]);
  };

  /* Send offer */
  const promptOffer = () => {
    if (isSeller) return;
    if (messagingDisabled) return;

    Alert.prompt?.(
        "Send Offer",
        "Enter amount:",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send",
            onPress: async (value : any) => {
              const amount = Number(value);
              if (!amount || amount <= 0) return;
              await sendOffer(threadId, user!.uid, amount, partnerId);
            },
          },
        ],
        "plain-text"
    );
  };

  /* Offer UI */
  const renderOffer = (item: any) => {
    const amt = item.raw.amount;
    const mine = item.sender === "me";

    return (
        <View
            style={[
              styles.messageBubble,
              mine ? styles.myMessage : styles.otherMessage,
            ]}
        >
          <Text style={[styles.messageText, mine && styles.myMessageText]}>
            Offer: ${amt}
          </Text>

          {/* Accept / Decline buttons (seller only) */}
          {isSeller && !mine && item.raw.offerStatus === "pending" && (
              <View style={{ flexDirection: "row", marginTop: 6, gap: 10 }}>
                <TouchableOpacity
                    onPress={() =>
                        acceptOffer(threadId, item.id, buyerId, amt)
                    }
                >
                  <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
                    Accept
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={async () => {
                      await declineOffer(threadId, item.id);     // ⭐ FIXED
                      const { sendMessage } = await import("../api");
                      await sendMessage(
                          threadId,
                          user!.uid,
                          "Offer declined",
                          partnerId
                      );
                    }}
                >
                  <Text style={{ color: "#EF4444", fontWeight: "600" }}>
                    Decline
                  </Text>
                </TouchableOpacity>
              </View>
          )}

          {/* Status labels */}
          {item.raw.offerStatus === "accepted" && (
              <Text style={{ color: COLORS.primary, marginTop: 6 }}>
                Accepted
              </Text>
          )}

          {item.raw.offerStatus === "declined" && (
              <Text style={{ color: "#EF4444", marginTop: 6 }}>
                Declined
              </Text>
          )}
        </View>
    );
  };

  /* Render message bubble */
  const renderMessage = ({ item }: any) => {
    const withdrawn = item.withdrawn;
    const mine = item.sender === "me";

    if (item.raw.type === "offer") {
      return (
          <View
              style={[
                styles.messageContainer,
                mine ? styles.myMessageContainer : styles.otherMessageContainer,
              ]}
          >
            {renderOffer(item)}
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
      );
    }

    return (
        <View
            style={[
              styles.messageContainer,
              mine ? styles.myMessageContainer : styles.otherMessageContainer,
            ]}
        >
          <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => {
                if (!withdrawn) openWithdrawMenu(item);
                if (!withdrawn) setActiveReactionTarget(item.id);
              }}
          >
            <View
                style={[
                  styles.messageBubble,
                  mine ? styles.myMessage : styles.otherMessage,
                ]}
            >
              {withdrawn ? (
                  <Text
                      style={[
                        styles.messageText,
                        { fontStyle: "italic", opacity: 0.6 },
                        mine && styles.myMessageText,
                      ]}
                  >
                    Message withdrawn
                  </Text>
              ) : item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.photo} />
              ) : (
                  <Text style={[styles.messageText, mine && styles.myMessageText]}>
                    {item.text}
                  </Text>
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.timeText}>{item.time}</Text>
        </View>
    );
  };

  /* Navigate from header */
  const handleHeaderPress = () => {
    if (!itemId && !partnerId) return;

    const actions: any[] = [];

    if (itemId)
      actions.push({
        text: "View this listing",
        onPress: () =>
            router.push({ pathname: "/item-detail", params: { itemId } }),
      });

    if (partnerId)
      actions.push({
        text: "View seller profile",
        onPress: () =>
            router.push({
              pathname: "/seller-profile/[userId]",
              params: { userId: partnerId },
            }),
      });

    actions.push({ text: "Cancel", style: "cancel" });

    Alert.alert(partnerName, "", actions);
  };

  return (
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
          keyboardVerticalOffset={90}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
              style={styles.headerLeft}
              activeOpacity={0.7}
              onPress={handleHeaderPress}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{partnerInitials}</Text>
            </View>

            <View>
              <Text style={styles.partnerName}>{partnerName}</Text>
              <Text style={styles.itemName}>📦 {itemName}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
              onPress={() =>
                  router.push(
                      `/block-user?userId=${partnerId}&name=${partnerName}`
                  )
              }
          >
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
                        : "You blocked this user. Unblock to chat."}
              </Text>
            </View>
        )}

        {/* MESSAGE LIST */}
        <View style={styles.messagesWrapper}>
          {messageRefresh.indicator}

          {messagingDisabled ? (
              <View style={styles.blockedMessages}>
                <Icon name="slash" size={24} color={COLORS.primary} />
                <Text style={styles.blockNoticeText}>Messages hidden.</Text>
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
        <View
            style={[
              styles.inputContainer,
              { paddingBottom: 10 + Math.max(insets.bottom, 8) },
            ]}
        >
          {/* OFFER BUTTON */}
          {!isSeller && (
              <TouchableOpacity
                  onPress={promptOffer}
                  disabled={messagingDisabled}
                  style={[
                    styles.offerButton,
                    messagingDisabled && styles.offerButtonDisabled,
                  ]}
              >
                <Icon name="dollar-sign" size={22} color={COLORS.white} />
              </TouchableOpacity>
          )}

          {/* PHOTO */}
          <TouchableOpacity
              onPress={pickAndSendPhoto}
              disabled={messagingDisabled}
          >
            <Icon
                name="image"
                size={28}
                color={messagingDisabled ? "#9CA3AF" : COLORS.primary}
            />
          </TouchableOpacity>

          {/* TEXT INPUT */}
          <TextInput
              style={[styles.input, messagingDisabled && styles.inputDisabled]}
              placeholder="Type a message..."
              value={message}
              onChangeText={setMessage}
              multiline
              editable={!messagingDisabled}
          />

          {/* SEND */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: { color: COLORS.white, fontWeight: "600" },

  partnerName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  itemName: { fontSize: 12, color: "#6B7280" },

  messagesWrapper: { flex: 1, backgroundColor: "#F3F4F6" },
  messagesContainer: { padding: 12 },

  blockedMessages: { alignItems: "center", gap: 8, padding: 24 },

  messageContainer: { marginBottom: 10, maxWidth: "78%" },
  myMessageContainer: { alignSelf: "flex-end" },
  otherMessageContainer: { alignSelf: "flex-start" },

  messageBubble: { padding: 12, borderRadius: 18 },

  myMessage: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  otherMessage: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  messageText: { fontSize: 15, color: "#111827" },
  myMessageText: { color: COLORS.white },

  timeText: { fontSize: 11, color: "#9CA3AF", marginTop: 4, alignSelf: "flex-end" },

  photo: { width: 220, height: 220, borderRadius: 12, backgroundColor: "#D1D5DB" },

  reactionPicker: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  reactionPickerEmoji: { fontSize: 20, color: "#F9FAFB" },

  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    alignItems: "center",
    gap: 10,
  },

  offerButton: {
    backgroundColor: "#10B981",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  offerButtonDisabled: { backgroundColor: "#9CA3AF" },

  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
  },

  inputDisabled: { opacity: 0.6 },

  sendButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  sendButtonDisabled: { backgroundColor: "#9CA3AF" },

  blockNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderColor: "#DBEAFE",
    padding: 16,
  },

  blockNoticeText: { color: "#1F2937", flex: 1 },
});