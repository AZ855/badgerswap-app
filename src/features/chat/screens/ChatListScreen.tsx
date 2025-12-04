/**
 * =====================================================================
 *  ChatListScreen – Unified Conversation View
 * =====================================================================
 *
 *  This screen displays ALL chat threads that the current user belongs to.
 *
 *  It uses:
 *     subscribeToThreads(userId)
 *
 *  which returns:
 *     - partnerName         (derived automatically in api.ts)
 *     - partnerInitials
 *     - itemName            (latest item context)
 *     - lastMessage
 *     - unreadCount
 *
 *  IMPORTANT:
 *  Chat threads now use the unified buyer–seller thread ID:
 *      buyer_seller
 *
 *  Therefore:
 *    ✔ Clicking different items from same seller still opens ONE thread
 *    ✔ The latest itemName updates automatically
 *    ✔ Partner name always correct
 *
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Alert,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

import { router } from 'expo-router';
import { db, doc, updateDoc, collection, getDocs, writeBatch } from '../../../lib/firebase';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../../theme/colors';
import SwipeRowActions from '../components/SwipeRowActions';

// Pull-to-refresh helper
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';

// Chat API – unified conversation model
import { subscribeToThreads } from '../api';

// User auth context
import { useAuth } from '../../auth/AuthProvider';



/* ======================================================================
 *  MAIN SCREEN
 * ====================================================================== */
export default function ChatListScreen() {

  const { user } = useAuth();
  const openSwipeRef = useRef<Swipeable | null>(null);

  // Raw conversation list from Firestore
  const [conversations, setConversations] = useState<any[]>([]);
  const [hiddenThreadIds, setHiddenThreadIds] = useState<string[]>([]);

  // Search bar text
  const [searchQuery, setSearchQuery] = useState('');



  /* ----------------------------------------------------------------------
   *  FIRESTORE real-time subscription
   * ----------------------------------------------------------------------
   *
   *  subscribeToThreads(user.uid) returns:
   *     [
   *        {
   *          id: threadId,
   *          partnerName,
   *          partnerInitials,
   *          itemName,
   *          lastMessage,
   *          unread: { [userId]: count }
   *        }
   *     ]
   *
   *  We transform this into a flat structure the UI can use easily.
   */
  useEffect(() => {
    if (!user) return;

    return subscribeToThreads(user.uid, (threads) => {
      // ⭐ FIX: show all threads, even if lastMessage is withdrawn
      const visibleThreads = threads.filter((t: any) => {
        return t.lastMessage && t.lastMessage.trim().length > 0;
      });

      const formatted = visibleThreads.map((t: any) => ({
        id: t.threadId ?? t.id,
        partnerName: t.partnerName,
        partnerInitials: t.partnerInitials,
        itemName: t.itemName ?? "Item",
        lastMessage: t.lastMessage?.trim()
            ? t.lastMessage
            : "Message withdrawn",    // already added
        timestamp: "now",
        unreadCount: t.unread?.[user.uid] || 0,
      }));

      const filteredByHide = formatted.filter(
          (t: any) => !hiddenThreadIds.includes(t.id)
      );
      setConversations(filteredByHide);
    });
  }, [user, hiddenThreadIds]);



  /* ----------------------------------------------------------------------
   * Pull-to-refresh (visual only)
   * Firestore already updates everything in real time.
   * ---------------------------------------------------------------------- */
  const handleRefresh = useCallback(() => {
    return new Promise<void>((resolve) => setTimeout(resolve, 300));
  }, []);

  const pullRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    indicatorOffset: 4,
  });



  /* ----------------------------------------------------------------------
   * Filter search results
   * ---------------------------------------------------------------------- */
  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();

    return (
        conv.partnerName?.toLowerCase().includes(q) ||
        conv.itemName?.toLowerCase().includes(q)
    );
  });



  const handleToggleRead = async (item: any) => {
    if (!user?.uid) return;
    try {
      const threadRef = doc(db, 'chats', item.id);
      const next = item.unreadCount > 0 ? 0 : 1;
      await updateDoc(threadRef, { [`unread.${user.uid}`]: next });
      // Close any open swipe row after toggling read state
      if (openSwipeRef.current) {
        openSwipeRef.current.close();
      }
    } catch (err) {
      console.error('Failed to toggle read state for thread', err);
    }
  };

  const handleHide = (item: any) => {
    setHiddenThreadIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
  };

  const executeDelete = async (item: any) => {
    try {
      const threadRef = doc(db, 'chats', item.id);
      const msgsRef = collection(threadRef, 'messages');
      const snap = await getDocs(msgsRef);
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      batch.delete(threadRef);
      await batch.commit();
    } catch (err) {
      console.error('Failed to delete thread', err);
    }
  };

  const handleDelete = (item: any) => {
    const closeRow = () => {
      if (openSwipeRef.current) {
        openSwipeRef.current.close();
      }
    };
    Alert.alert(
      'Delete conversation?',
      'This will clear the entire chat history for this thread.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: closeRow,
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            executeDelete(item);
            closeRow();
          },
        },
      ]
    );
  };

  const renderRightActions = (item: any, progress: Animated.AnimatedInterpolation<number>) => {
    const isCurrentlyUnread = item.unreadCount > 0;
    return (
      <SwipeRowActions
        progress={progress}
        isUnread={isCurrentlyUnread}
        onToggleRead={() => handleToggleRead(item)}
        onHide={() => handleHide(item)}
        onDelete={() => handleDelete(item)}
      />
    );
  };


  /* ----------------------------------------------------------------------
   * Render a single conversation preview row
   * ---------------------------------------------------------------------- */
  const renderConversation = ({ item }: any) => {
    let rowSwipeRef: Swipeable | null = null;
    return (
      <Swipeable
        ref={(ref) => {
          rowSwipeRef = ref;
        }}
        overshootRight={false}
        renderRightActions={(progress) => renderRightActions(item, progress)}
        onSwipeableWillOpen={() => {
          if (openSwipeRef.current && openSwipeRef.current !== rowSwipeRef) {
            openSwipeRef.current.close();
          }
          openSwipeRef.current = rowSwipeRef;
        }}
        onSwipeableClose={() => {
          if (openSwipeRef.current === rowSwipeRef) {
            openSwipeRef.current = null;
          }
        }}
      >
        <TouchableOpacity
          style={styles.conversationItem}
          onPress={() => router.push(`/conversation/${item.id}`)}
        >
          {/* Avatar with unread dot */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.partnerInitials}</Text>
            </View>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 9 ? '9+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>

        {/* Conversation details */}
        <View style={styles.conversationContent}>

          {/* Header (partner name + timestamp) */}
          <View style={styles.conversationHeader}>
            <Text style={styles.partnerName}>{item.partnerName}</Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>

          {/* Item name */}
          <Text style={styles.itemName}>📦 {item.itemName}</Text>

          {/* Last message preview */}
          <View style={styles.messagePreview}>
            <Text
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.lastMessageUnread,
                ]}
                numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>

        </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };



  /* ======================================================================
   *  UI RENDER
   * ====================================================================== */
  return (
      <GestureHandlerRootView style={styles.container}>

        {/* ================================================================
       *  Search bar
       * ================================================================ */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9CA3AF" />

          <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              value={searchQuery}
              onChangeText={setSearchQuery}
          />

          {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="x" size={20} color="#9CA3AF" />
              </TouchableOpacity>
          )}
        </View>



        {/* ================================================================
       *  Conversation List or Empty State
       * ================================================================ */}
        {filteredConversations.length > 0 ? (
            <View style={{ flex: 1 }}>
              {pullRefresh.indicator}

              <Animated.FlatList
                  data={filteredConversations}
                  renderItem={renderConversation}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={pullRefresh.listStyle}
                  contentContainerStyle={styles.listContent}
                  onScroll={pullRefresh.onScroll}
                  onScrollEndDrag={pullRefresh.onRelease}
                  onMomentumScrollEnd={pullRefresh.onRelease}
                  scrollEventThrottle={16}
              />
            </View>
        ) : (
            <View style={{ flex: 1 }}>
              {pullRefresh.indicator}
              <Animated.ScrollView
                  style={pullRefresh.listStyle}
                  contentContainerStyle={styles.emptyState}
                  onScroll={pullRefresh.onScroll}
                  onScrollEndDrag={pullRefresh.onRelease}
                  onMomentumScrollEnd={pullRefresh.onRelease}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}
              >
                <Icon name="message-circle" size={64} color="#D1D5DB" />

                <Text style={styles.emptyStateTitle}>
                  {searchQuery ? 'No conversations found' : 'No messages yet'}
                </Text>

                <Text style={styles.emptyStateText}>
                  {searchQuery
                      ? 'Try searching for something else'
                      : 'Start browsing the marketplace and message sellers'}
                </Text>

                {/* Button to go browse the marketplace */}
                {!searchQuery && (
                    <TouchableOpacity
                        style={styles.browseButton}
                        onPress={() => router.push('/marketplace')}
                    >
                      <Text style={styles.browseButtonText}>
                        Browse Marketplace
                      </Text>
                    </TouchableOpacity>
                )}
              </Animated.ScrollView>
            </View>
        )}

      </GestureHandlerRootView>
  );
}



/* ======================================================================
 *  STYLES
 * ====================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingBottom: 96,
  },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },

  // Each conversation row
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 18,
    height: 88,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  avatarWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '600',
  },

  conversationContent: {
    flex: 1,
  },

  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  itemName: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },

  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },

  lastMessageUnread: {
    fontWeight: '600',
    color: '#374151',
  },

  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  unreadCount: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },

  listContent: {
    paddingBottom: 112,
    flexGrow: 1,
  },

  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },

  browseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
