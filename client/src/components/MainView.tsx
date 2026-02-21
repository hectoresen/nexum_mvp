import { useState } from 'react';
import { AppState } from '../App';
import ChannelList from './ChannelList';
import ChatArea from './ChatArea';

interface MainViewProps {
  state: AppState;
  onDisconnect: () => void;
  onCreateChannel: (name: string, type: 'text' | 'voice') => void;
  onJoinChannel: (channelId: string) => void;
  onSendMessage: (content: string) => void;
}

export default function MainView({
  state,
  onDisconnect,
  onCreateChannel,
  onJoinChannel,
  onSendMessage,
}: MainViewProps) {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim(), newChannelType);
      setNewChannelName('');
      setShowCreateChannel(false);
    }
  };

  const currentChannel = state.channels.find(ch => ch.id === state.currentChannelId);
  const currentMessages = state.currentChannelId 
    ? state.messages.get(state.currentChannelId) || []
    : [];

  return (
    <div className="flex h-full w-full bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col">
        {/* Server header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold truncate">Voice Server</h2>
          <p className="text-xs text-gray-400 mt-1">
            {state.username} • {state.role}
          </p>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">
                Channels
              </span>
              {state.role === 'owner' && (
                <button
                  onClick={() => setShowCreateChannel(!showCreateChannel)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Create channel"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            {showCreateChannel && (
              <form onSubmit={handleCreateChannel} className="mb-3 p-2 bg-gray-700 rounded">
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Channel name"
                  className="w-full px-2 py-1 mb-2 text-sm bg-gray-600 border border-gray-500 rounded text-white"
                  autoFocus
                />
                <div className="flex gap-2 mb-2">
                  <label className="flex items-center text-xs text-gray-300">
                    <input
                      type="radio"
                      value="text"
                      checked={newChannelType === 'text'}
                      onChange={() => setNewChannelType('text')}
                      className="mr-1"
                    />
                    Text
                  </label>
                  <label className="flex items-center text-xs text-gray-300">
                    <input
                      type="radio"
                      value="voice"
                      checked={newChannelType === 'voice'}
                      onChange={() => setNewChannelType('voice')}
                      className="mr-1"
                    />
                    Voice
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateChannel(false)}
                    className="flex-1 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <ChannelList
              channels={state.channels}
              currentChannelId={state.currentChannelId}
              onSelectChannel={onJoinChannel}
            />
          </div>
        </div>

        {/* User info footer */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {state.username[0]?.toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-white truncate max-w-[120px]">
                {state.username}
              </span>
            </div>
            <button
              onClick={onDisconnect}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
              title="Disconnect"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {currentChannel ? (
          <ChatArea
            channel={currentChannel}
            messages={currentMessages}
            currentUserId={state.userId || ''}
            onSendMessage={onSendMessage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
