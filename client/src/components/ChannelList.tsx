import { Channel } from '../types/protocol';

interface ChannelListProps {
  channels: Channel[];
  currentChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
}

export default function ChannelList({ 
  channels, 
  currentChannelId, 
  onSelectChannel 
}: ChannelListProps) {
  const textChannels = channels.filter(ch => ch.channel_type === 'text');
  const voiceChannels = channels.filter(ch => ch.channel_type === 'voice');

  return (
    <div className="space-y-4">
      {textChannels.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">
            Text Channels
          </h3>
          {textChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                currentChannelId === channel.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
              }`}
            >
              <span className="text-gray-500">#</span>
              <span className="text-sm truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      )}

      {voiceChannels.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">
            Voice Channels
          </h3>
          {voiceChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-full text-left px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${
                currentChannelId === channel.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span className="text-sm truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      )}

      {channels.length === 0 && (
        <div className="px-2 py-4 text-center text-sm text-gray-500">
          No channels yet
        </div>
      )}
    </div>
  );
}
