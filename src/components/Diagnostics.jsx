import React from 'react'
import UniversalTest from './UniversalTest'
import data from '../data/diagnostics_legacy.json'

function Diagnostics({ customStages, ...props }) {
  const testData = customStages || data
  return <UniversalTest data={testData} {...props} />
}


export default Diagnostics
