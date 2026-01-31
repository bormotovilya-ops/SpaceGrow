import React, { useEffect } from 'react'
import UniversalTest from './UniversalTest'
import data from '../data/diagnostics_legacy.json'
import { useLogEvent } from '../hooks/useLogEvent'
import { useHashSectionScroll } from '../hooks/useHashSectionScroll'

function Diagnostics({ customStages, ...props }) {
  const testData = customStages || data
  const { trackSectionView } = useLogEvent()

  useEffect(() => {
    trackSectionView('diagnostics')
  }, [trackSectionView])

  useHashSectionScroll({ clearAfterScroll: true })

  return <UniversalTest data={testData} {...props} />
}

export default Diagnostics
