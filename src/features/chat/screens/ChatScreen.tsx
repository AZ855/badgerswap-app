import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather as Icon } from '@expo/vector-icons';
import { COLORS } from '../../../theme/colors';
import { MOCK_MESSAGES } from '../mock/messages';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';

// Mock messages moved to ../mock/messages

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const userName = params.userName as string || 'User';
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const handleRefreshMessages = useCallback(() => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setMessages((prev) => {
          const incoming = {
            id: Date.now(),
            text: 'New replies synced from server.',
            sender: 'other' as const,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          return [incoming, ...prev].slice(0, 60);
        });
        resolve();
      }, 600);
    });
  }, []);

  const messageRefresh = usePullToRefresh({
    onRefresh: handleRefreshMessages,
    indicatorOffset: 4,
  });

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([
        ...messages,
        {
          id: messages.length + 1,
          text: message,
          sender: 'me',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setMessage('');
    }
  };

  const renderMessage = ({ item }: any) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'me' ? styles.myMessageContainer : styles.otherMessageContainer,
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      {/* Header with item info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.split(' ').map(n => n[0]).join('')}</Text>
          </View>
          <View>
            <Text style={styles.partnerName}>{userName}</Text>
            <Text style={styles.itemName}>📚 Calculus Textbook</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Icon name="more-vertical" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <View style={styles.messagesWrapper}>
        {messageRefresh.indicator}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.messagesContainer,
            { paddingTop: messageRefresh.listPaddingTop + 16 },
          ]}
          onScroll={messageRefresh.onScroll}
          onScrollEndDrag={messageRefresh.onRelease}
          onMomentumScrollEnd={messageRefresh.onRelease}
          scrollEventThrottle={16}
          inverted={false}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Icon name="send" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  messagesWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
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
