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

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';
import { Feather as Icon } from '@expo/vector-icons';

import { COLORS } from '../../../theme/colors';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { useAuth } from '../../auth/AuthProvider';

import {
  subscribeToMessages,
  clearUnread,
} from '../api';

import { db, doc, getDoc } from '../../../lib/firebase';



/* ======================================================================
 *  MAIN CHAT SCREEN
 * ====================================================================== */
export default function ChatScreen() {

  const { user } = useAuth();

  // threadId is the ONLY navigation param needed now
  const { threadId } = useLocalSearchParams() as { threadId: string };

  // Header metadata (loaded from Firestore)
  const [partnerName, setPartnerName] = useState("User");
  const [partnerInitials, setPartnerInitials] = useState("U");
  const [itemName, setItemName] = useState("Item");

  // Message state
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);



  /* ====================================================================
   * 1. Load thread header metadata from Firestore
   * ==================================================================== */
  useEffect(() => {
    if (!user || !threadId) return;

    const loadThreadInfo = async () => {
      const ref = doc(db, "chats", threadId);
      const snap = await getDoc(ref);

      if (!snap.exists()) return;

      const data = snap.data();

      // Determine the other participant
      const otherId = data.participants.find((p: string) => p !== user.uid);

      // Name/initial selection logic
      const pName =
          otherId === data.sellerId ? data.sellerName : data.buyerName;

      const pInitials =
          otherId === data.sellerId ? data.sellerInitials : data.buyerInitials;

      setPartnerName(pName || "User");
      setPartnerInitials((pInitials || "U").toUpperCase());
      setItemName(data.itemName || "Item");
    };

    loadThreadInfo();

  }, [threadId, user]);



  /* ====================================================================
   * 2. Subscribe to message list (real-time)
   * ==================================================================== */
  useEffect(() => {
    if (!user || !threadId) return;

    // Reset unread count when entering the chat
    clearUnread(threadId, user.uid);

    const unsub = subscribeToMessages(threadId, (msgs) => {

      const formatted = msgs.map((m: any) => ({
        id: m.id,
        text: m.text,
        sender: m.senderId === user.uid ? 'me' : 'other',
        time: m.createdAt?.toDate
            ? m.createdAt.toDate().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
            : '',
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



  /* ====================================================================
   * Sending a message
   * ==================================================================== */
  const sendMessage = async () => {

    if (!message.trim() || !threadId || !user) return;

    // IMPORTANT: lazy-loaded to avoid circular import
    const { sendMessage: sendMessageToFirestore } = await import('../api');

    await sendMessageToFirestore(threadId, user.uid, message.trim());

    setMessage('');
  };



  /* ====================================================================
   * Rendering a chat bubble
   * ==================================================================== */
  const renderMessage = ({ item }: any) => (
      <View
          style={[
            styles.messageContainer,
            item.sender === 'me'
                ? styles.myMessageContainer
                : styles.otherMessageContainer,
          ]}
      >
        <View
            style={[
              styles.messageBubble,
              item.sender === 'me' ? styles.myMessage : styles.otherMessage,
            ]}
        >
          <Text
              style={[
                styles.messageText,
                item.sender === 'me' && styles.myMessageText,
              ]}
          >
            {item.text}
          </Text>
        </View>

        <Text style={styles.timeText}>{item.time}</Text>
      </View>
  );



  /* ====================================================================
   * SCREEN RENDER
   * ==================================================================== */
  return (
      <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={90}
      >


        {/* ===========================================================
       * HEADER (partnerName + itemName)
       * =========================================================== */}
        <View style={styles.header}>

          <View style={styles.headerLeft}>

            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {partnerInitials}
              </Text>
            </View>

            {/* Names */}
            <View>
              <Text style={styles.partnerName}>{partnerName}</Text>
              <Text style={styles.itemName}>📦 {itemName}</Text>
            </View>

          </View>

          <TouchableOpacity>
            <Icon name="more-vertical" size={24} color="#374151" />
          </TouchableOpacity>

        </View>



        {/* ===========================================================
       * MESSAGE LIST
       * =========================================================== */}
        <View style={styles.messagesWrapper}>

          {messageRefresh.indicator}

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

        </View>



        {/* ===========================================================
       * INPUT BAR
       * =========================================================== */}
        <View style={styles.inputContainer}>

          <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={message}
              onChangeText={setMessage}
              multiline
          />

          <TouchableOpacity
              style={styles.sendButton}
              onPress={sendMessage}
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

  /* -------------------- HEADER -------------------- */
  header: {
    backgroundColor: COLORS.white,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: COLORS.white,
    fontWeight: '600',
  },

  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  itemName: {
    fontSize: 12,
    color: '#6B7280',
  },

  /* -------------------- MESSAGE LIST -------------------- */
  messagesWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },


  /* -------------------- CHAT BUBBLES -------------------- */
  messageContainer: {
    marginBottom: 16,
    maxWidth: '75%',
  },

  myMessageContainer: {
    alignSelf: 'flex-end',
  },

  otherMessageContainer: {
    alignSelf: 'flex-start',
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
    color: '#374151',
  },

  myMessageText: {
    color: COLORS.white,
  },

  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  /* -------------------- INPUT BAR -------------------- */
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },

  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },

  sendButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

});