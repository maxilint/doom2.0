import React, { useEffect, useRef, useState, useContext } from 'react'
import InputUsername from '../../components/InputUsername'
import { useHistory } from 'react-router-dom'
import UserContext from '../../context/user'
import { getClient } from '../../zomes'
import Container from '../../components/Container'
import Loader from '../../components/Loader'

export default function Login() {
  const history = useHistory()
  const { user, setUser } = useContext(UserContext)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [holochain, setHolochain] = useState(false)

  async function getHolochainClient() {
    console.log('login index')
    const { client, cellId, unsubscribe } = await getClient({
      callback: () => {},
    })

    setHolochain({ client, cellId, unsubscribe })
  }

  const getProfile = async () => {
    console.log('in get profile')
    console.log(holochain)
    debugger
    const result = await holochain.client.callZome(
      holochain.cellId,
      'profiles_coordinator',
      'get_my_profile',
      null,
      50000
    )

    console.log('after response from holochain')
    if (result) {
      setUser(result)
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user.profile.nickname) history.push('/home')
  }, [user])

  const onLogin = async ({ username, email }) => {
    console.log('in on login')
    setLoading(true)
    const result = await holochain.client.callZome(
      holochain.cellId,
      'profiles_coordinator',
      'create_profile',
      {
        nickname: username,
        fields: { email: email },
      }
    )
    console.log('PROFILE CREATED')
    if (result) {
      setUser(result)
      setError(false)
      history.push('/home')
    } else {
      setError(true)
      setLoading(false)
    }
  }

  useEffect(() => {
    getHolochainClient()
  }, [])

  useEffect(() => {
    if (holochain) getProfile()
    return () => {
      if (holochain) holochain.unsubscribe()
    }
  }, [holochain])

  return (
    <Container>
      {loading ? <Loader /> : <InputUsername onLogin={onLogin} />}
    </Container>
  )
}
