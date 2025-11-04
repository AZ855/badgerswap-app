export type Message = {
  id: number;
  text: string;
  sender: 'me' | 'other';
  time: string;
};

export const MOCK_MESSAGES: Message[] = [
  { id: 1, text: 'Hi! Is the calculus textbook still available?', sender: 'other', time: '10:30 AM' },
  { id: 2, text: 'Yes, it is! Are you interested?', sender: 'me', time: '10:32 AM' },
  { id: 3, text: 'Definitely! What condition is it in?', sender: 'other', time: '10:33 AM' },
  { id: 4, text: "It's in good condition. Some highlighting but all pages are intact.", sender: 'me', time: '10:35 AM' },
  { id: 5, text: 'Perfect! Can we meet at Memorial Library tomorrow?', sender: 'other', time: '10:36 AM' },
  { id: 6, text: 'That works for me! How about 2 PM?', sender: 'me', time: '10:38 AM' },
];

// Placeholder – in the future this can filter by id
export const getMessagesByUserId = (_userId: string | number) => MOCK_MESSAGES;

