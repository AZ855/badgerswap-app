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

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';

import { router } from 'expo-router';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../../theme/colors';

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

  // Raw conversation list from Firestore
  const [conversations, setConversations] = useState<any[]>([]);

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

      const formatted = threads.map((t: any) => ({
        id: t.threadId ?? t.id,     // ensure threadId is used consistently
        partnerName: t.partnerName,
        partnerInitials: t.partnerInitials,
        itemName: t.itemName ?? "Item",
        lastMessage: t.lastMessage || "",
        timestamp: "now",          // placeholder; can swap for real date later
        unreadCount: t.unread?.[user.uid] || 0,
      }));

      setConversations(formatted);
    });
  }, [user]);



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



  /* ----------------------------------------------------------------------
   * Render a single conversation preview row
   * ---------------------------------------------------------------------- */
  const renderConversation = ({ item }: any) => (
      <TouchableOpacity
          style={styles.conversationItem}

          /**
           * IMPORTANT:
           * Navigate using ONLY the unified threadId.
           */
          onPress={() => router.push(`/conversation/${item.id}`)}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.partnerInitials}</Text>
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

          {/* Last message preview + unread badge */}
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

            {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{item.unreadCount}</Text>
                </View>
            )}
          </View>

        </View>
      </TouchableOpacity>
  );



  /* ======================================================================
   *  UI RENDER
   * ====================================================================== */
  return (
      <View style={styles.container}>

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
            <View style={styles.emptyState}>
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
            </View>
        )}

      </View>
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
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
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
    paddingBottom: 96,
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