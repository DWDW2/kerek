pub mod user;
pub mod conversation;
pub mod message;

// Re-export commonly used types
pub use user::{User, NewUser, LoginRequest, AuthResponse, UpdateProfileRequest, UserProfile};
pub use conversation::{Conversation, NewConversation, ConversationResponse, ConversationParticipant};
pub use message::{Message, NewMessage, UpdateMessage, MessageResponse, MessageSender};
