import React, { useEffect, useRef, useState, useContext } from 'react'
// const { ipcRenderer } = window.require('electron')
// const { desktopCapturer } = window.require('electron')
import { useHistory, useParams } from 'react-router-dom'
import UserContext from '../../context/user'
import { getClient } from '../../zomes'
import {
  addPeer,
  createPeer,
  answerPeer,
  stopBothVideoAndAudio,
} from '../../webrtc/peer'
import Container from '../../components/Container'
import Back from '../../components/Back'
import Button from '../../components/Button'
import Error from '../../components/Error'
import { getMedia, formatIncomingSignal } from '../../utils/helpers'
import './styles.css'

const Video = ({ peer }) => {
  const ref = useRef()
  useEffect(() => {
    peer.peer.on('stream', (stream) => {
      ref.current.srcObject = stream
    })
  }, [])

  return (
    <div className="video">
      <video playsInline autoPlay ref={ref} />
    </div>
  )
}

let recordStream = null
let recordData = []
let mediaRecorder = null

let recordObject = null

export default function Room() {
  const history = useHistory()
  const params = useParams()
  const { user } = useContext(UserContext)
  const { id } = params

  const [stream, setStream] = useState(null)
  const userVideo = useRef()

  const holochainRef = useRef({})
  const [error, setError] = useState(null)
  const [peers, setPeers] = useState([])
  const [signal, setSignal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)

  // ipcRenderer.on('SET_SOURCE', async (event, sourceId) => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       audio: false,
  //       video: {
  //         mandatory: {
  //           chromeMediaSource: 'desktop',
  //           chromeMediaSourceId: sourceId,
  //           minWidth: 1280,
  //           maxWidth: 1280,
  //           minHeight: 720,
  //           maxHeight: 720,
  //         },
  //       },
  //     })
  //     handleStream(stream)
  //   } catch (e) {
  //     handleError(e)
  //   }
  // })

  // function handleStream(stream) {
  //   const video = document.querySelector('video')
  //   video.srcObject = stream
  //   video.onloadedmetadata = (e) => video.play()
  // }

  // function handleError(e) {
  //   console.log(e)
  // }

  async function recordHandler() {
    // let sourceId = null
    // desktopCapturer
    //   .getSources({ types: ['window', 'screen'] })
    //   .then(async (sources) => {
    //     for (const source of sources) {
    //       console.log(source)
    //       if (source.name === 'Doom') {
    //         console.log(`source id: ${source.id}`)
    //         sourceId = source.id
    //         return
    //       }
    //     }
    //   })
    if (isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      // stop recording
    } else {
      setIsRecording(true)

      recordStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          // mediaSource: 'screen',
          mediaSource: 'window',
          // mediaSourceId: sourceId,

          chromeMediaSource: 'window',
          // chromeMediaSourceId: sourceId,
        },
      })
      mediaRecorder = new MediaRecorder(recordStream)
      mediaRecorder.ondataavailable = (e) => {
        recordData.push(e.data)
        console.log(recordData)
      }
      mediaRecorder.onstop = (e) => {
        recordObject = URL.createObjectURL(
          new Blob(recordData, {
            type: recordData[0].type,
          })
        )

        document.getElementById('videoDisplayer').src = recordObject

        console.log(recordObject)
      }
      mediaRecorder.start()
    }
  }

  async function init() {
    const stream = await getMedia()
    if (stream.error) {
      setError(stream.error)
      return
    }
    userVideo.current.srcObject = stream
    setStream(stream)
    getHolochainClient()
  }

  async function getHolochainClient() {
    const { client, cellId, unsubscribe } = await getClient({
      callback: (e) => setSignal(e),
    })
    holochainRef.current = { client, cellId, unsubscribe }
    // console.log('getHolochainClient', holochainRef.current)
  }

  function callZome(signal, to, type) {
    holochainRef.current.client.callZome(
      holochainRef.current.cellId,
      'peers',
      type,
      {
        payload_type: signal.type,
        sdp: signal.sdp,
        to: to,
      }
    )
    // console.log('callZome', {
    //   payload_type: signal.type,
    //   sdp: signal.sdp,
    //   to: to,
    // })
  }

  function onConnect(peer) {
    console.log('conected', peer)
  }

  function onData(data) {
    const decoded = new TextDecoder().decode(data)
    console.log('new messge', decoded)
  }

  function handleIncomingSignal({ incomingSignal, signalName, to, from }) {
    // console.log('handleIncomingSignal', { signal, signalName, to, from })
    const callbacks = {
      stream,
      onError: setError,
      onSignal: callZome,
      onConnect,
      onData,
    }
    if (signalName === 'PeerJoined') {
      const peer = createPeer({
        to,
        ...callbacks,
      })
      const aux = [...peers]
      aux.push({
        to: to,
        peer: peer,
      })
      setPeers(aux)
    } else if (signalName === 'Offer') {
      const peer = addPeer({
        signal: incomingSignal,
        from,
        ...callbacks,
      })
      const aux = [...peers]
      aux.push({
        to: to,
        peer: peer,
      })
      setPeers(aux)
    } else if (signalName === 'Answer') {
      answerPeer({ signal: incomingSignal, from, peers })
    }
  }

  function cleanUp() {
    holochainRef.current && holochainRef.current.unsubscribe()
    stopBothVideoAndAudio(userVideo.current.srcObject)
    // peers.forEach((peer) => {
    //   console.log(peer)
    //   peer.peer.close()
    // })
    history.goBack()
  }

  function onError() {
    history.goBack()
  }

  useEffect(() => {
    if (!user.profile || !user.profile.nickname) history.goBack()
    else init()
  }, [user])

  useEffect(() => {
    if (signal) {
      const {
        signal: incomingSignal,
        signalName,
        to,
        from,
      } = formatIncomingSignal(signal)
      handleIncomingSignal({ incomingSignal, signalName, to, from })
    }
  }, [signal])

  return (
    <Container>
      <Back onClick={cleanUp} />
      <div className="record-button-container">
        <Button onClick={recordHandler}>Record</Button>
      </div>
      <div className="video-2">
        <video
          id="videoDisplayer"
          width="700"
          height="400"
          src=""
          controls
        ></video>
      </div>
      <div className="video-container">
        <div className="video">
          <video muted ref={userVideo} autoPlay playsInline />
        </div>
        {peers.map(function (peer, index) {
          return <Video key={index} peer={peer} />
        })}
      </div>
      {error && <Error message={error} onClick={onError} />}
    </Container>
  )
}
