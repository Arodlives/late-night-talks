import { useState, useRef,useEffect } from 'react';
import Head from 'next/head'
import Image from 'next/image'
import YouTube from 'react-youtube';
import { StreamChat } from 'stream-chat'
import 'stream-chat-react/dist/css/v2/index.css';
import styles from '../styles/Home.module.css'
import { Chat, Channel, ChannelHeader, MessageInput, VirtualizedMessageList, Window, MessageInputFlat } from 'stream-chat-react';

export default function Home() {
  const [user, setUser] = useState({});
  const [client,setClient]=useState();
  const [channel,setChannel]=useState();
  const[messages,setMessages]=useState([]);
  // console.log('client',client)

  const videoRef = useRef();


  useEffect(()=>{
    //*Optional chaining with '?'
    if(!user?.id) return;
    //Wrapping with async
    (async function run(){
      const client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY);
      setClient(client);
      
      const { token } = await fetch('/api/token',{
        method:'POST',
        body:JSON.stringify({
          id:user.id
        })
      }).then(r=>r.json())

      const connectedUser = await client.connectUser(
        {
            id: user.id,
            name: user.id,
            image: 'https://i.imgur.com/fR9Jz14.png',
        },
        //*⬇️A token
       token
    )
      //* After connecting user
      const channel = client.channel('livestream','spacejelly', {
      name: 'Spacejelly',
      });
      setChannel(channel);


    })();
    //*Cleaning resource when that instance is no longer needed
    return ()=> {
      client.disconnectUser();
      setChannel(undefined)
    }
},[user.id]);

  useEffect(()=>{
    if(!channel)return;
    const listener = channel.on('message.new',async (event)=>{
      const player = videoRef.current.getInternalPlayer();
      const time=await player.getCurrentTime();
      setMessages(prev=>{
        return[
          ...prev,
          {
            message:event.message,
            time
          }
        ]
      })
    })
    return ()=>{
      listener.unsubscribe();
    }
  },[channel])

  /**
   * onStartVideo
   */

  function onStartVideo() {
    const player = videoRef.current.getInternalPlayer();
    player.playVideo();
  }

  /**
   * onStopVideo
   */

  function onStopVideo() {
    const player = videoRef.current.getInternalPlayer();
    player.pauseVideo();
  }

  /**
   * onReplayVideo
   */

  function onReplayVideo() {
    const player = videoRef.current.getInternalPlayer();

    player.pauseVideo();
    player.seekTo(0);
    player.playVideo();
    
    const channel = client.channel('livestream',`spacejelly-replay-${Date.now()}`, {
      name: 'Spacejelly',
      });
      setChannel(channel);


      setInterval(async ()=>{
        const time = await player.getCurrentTime()
        
        const currentMessages = messages.filter(({time : messageTime})=>{
          const diff = time - messageTime;
          return diff <= 1 && diff >0;
        });

        currentMessages.forEach(async({message})=>{
          await channel.sendMessage({
            text: message.text,
        });
        })
      },1000)
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Stream &amp; Chat!</title>
        <meta name="description" content="Watch some youtube and chat with your friends!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>

        {!user?.id && (
          <>
            <h1>Stream</h1>

            <p>To get started, enter your username or alias:</p>

            {/* //*great for sign in as a guest */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const id = Array.from(e.currentTarget.elements).find(({ name }) => name ==='userId').value;
              setUser({ id });
            }}>
              <input type="text" name="userId" />
              <button>Join</button>
            </form>
          </>
        )}

        {user?.id && (
          <>
            <div className={styles.stream}>
              <div className={styles.streamVideo}>
                <YouTube ref={videoRef} videoId="aYZRRyukuIw"  opts={{
                  playerVars: {
                    controls: 0
                  }
                }} />
                <p>
                  <button onClick={onStartVideo}>Start</button>
                  <button onClick={onStopVideo}>Stop</button>
                  <button onClick={onReplayVideo}>Replay</button>
                </p>
              </div>

              <div>
                {client && channel &&(
                <Chat client={client} theme='str-chat__theme-dark'>
                  <Channel channel={channel}>
                    <Window>
                      <ChannelHeader live />
                      <VirtualizedMessageList />
                      {!channel.id.includes('replay')&&(
                        <MessageInput input={MessageInputFlat} focus />
                      )}
                    </Window>
                  </Channel>
                </Chat>
                )}
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  )
}
