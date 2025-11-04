export const MOCK_CONVERSATIONS = [
  {
    id: 1,
    partnerName: 'Sarah Johnson',
    partnerInitials: 'SJ',
    itemName: 'Calculus Textbook',
    lastMessage: 'That works for me! How about 2 PM?',
    timestamp: '2m ago',
    unreadCount: 2,
  },
  {
    id: 2,
    partnerName: 'Mike Chen',
    partnerInitials: 'MC',
    itemName: 'Mini Fridge',
    lastMessage: 'Is it still available?',
    timestamp: '1h ago',
    unreadCount: 0,
  },
  {
    id: 3,
    partnerName: 'Emily Davis',
    partnerInitials: 'ED',
    itemName: 'Desk Lamp',
    lastMessage: "Thanks! I'll pick it up tomorrow.",
    timestamp: '3h ago',
    unreadCount: 0,
  },
  {
    id: 4,
    partnerName: 'Alex Martinez',
    partnerInitials: 'AM',
    itemName: 'UW Hoodie',
    lastMessage: 'Can you send more pictures?',
    timestamp: '1d ago',
    unreadCount: 1,
  },
  {
    id: 5,
    partnerName: 'Jessica Kim',
    partnerInitials: 'JK',
    itemName: 'Bike Lock',
    lastMessage: 'Perfect, see you then!',
    timestamp: '2d ago',
    unreadCount: 0,
  },
];

export const getConversationById = (id: number) =>
  MOCK_CONVERSATIONS.find(c => c.id === id) ?? null;

