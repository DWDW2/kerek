# Conversation Customization Feature

This feature allows users to customize the appearance of their conversations with:

## Features

1. **Background Image Upload**: Upload custom background images for conversations
2. **Message Colors**: Customize colors for your messages and other participants' messages
3. **Text Colors**: Customize text colors for better readability

## Components

### ConversationCustomization

Main component for the customization interface with:

- Image upload functionality
- Color pickers for message backgrounds
- Color pickers for text colors
- Preset color options

### ConversationCustomizationDialog

Dialog wrapper for the customization component

### R2Uploader

Utility class for uploading images to Cloudflare R2

## Environment Variables Required

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL=https://your-custom-domain.com
```

## API Routes

- `POST /api/upload` - Handles image uploads to Cloudflare R2
- `PATCH /api/conversations/[id]/customization` - Updates conversation customization

## Usage

1. Open a conversation
2. Click the "Customize" button in the header
3. Upload a background image (optional)
4. Select colors for messages and text
5. Save changes

The customization is applied immediately to the conversation view with:

- Background image with overlay for readability
- Custom message bubble colors
- Custom text colors
- Smooth transitions and animations

## File Structure

```
src/
├── components/conversations/
│   ├── conversation-customization.tsx
│   ├── conversation-customization-dialog.tsx
│   ├── message-item.tsx (updated)
│   ├── message-list.tsx (updated)
│   └── conversation-detail.tsx (updated)
├── lib/
│   └── r2-upload.ts
├── types/
│   └── conversation.ts (updated)
├── server/
│   └── conversations.ts (updated)
└── app/api/
    ├── upload/route.ts
    └── conversations/[id]/customization/route.ts
```
