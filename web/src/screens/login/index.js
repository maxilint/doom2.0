import React, { useEffect, useRef, useState, useContext } from 'react'
import InputUsername from '../../components/InputUsername'
import { useHistory } from 'react-router-dom'
import UserContext from '../../context/user'
import { getClient } from '../../zomes'
import Container from '../../components/Container'
import Loader from '../../components/Loader'
import { EntryRecord } from '@holochain-open-dev/utils'

export default function Login() {
  const history = useHistory()
  const { userProfile, setUserProfile } = useContext(UserContext)

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
    const result = await holochain.client.callZome(
      holochain.cellId,
      'profiles_coordinator',
      'get_my_profile',
      null
    )
    // get_my_profile returns a record, which requires the EntryRecord to be parsed.
    const profileRecord = new EntryRecord(result)
    const profile = profileRecord.entry
    console.log(profile)
    if (profile) {
      setUserProfile(profile)
    } else {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile.nickname) history.push('/home')
  }, [userProfile])

  const onLogin = async ({ username, email }) => {
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

    const profileRecord = new EntryRecord(result)
    const profile = profileRecord.entry

    if (profile) {
      setUserProfile(profile)
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
