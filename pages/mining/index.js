import * as React from 'react'
import { MiningPage } from '@components/mining/page'
import { AppCoLogo } from '@components/mining/logo'
import { Hero, Steps } from '@pages/mining/hero'
import { Earn } from '@pages/mining/earn'
import { How } from '@pages/mining/how'
import { Why } from '@pages/mining/why'
import { Closing } from '@pages/mining/closing'
import { FAQ } from '@pages/mining/faq'
import { Section, HeaderType, Watch } from '@pages/mining/shared'
import Head from '@containers/head'

const Header = () => (
  <Watch>
    <Section>
      <HeaderType>App Mining by</HeaderType> <AppCoLogo size={32} m={2} />
      <HeaderType>App.co</HeaderType>
    </Section>
  </Watch>
)

const sections = [
  <>
    <Hero />
    <Steps id="steps" />
  </>,
  <Earn id="how-to-earn" />,
  <How id="how-ranking-works" />,
  <Why id="why" />,
  <Closing id="register-your-app" />,
  <FAQ id="faq" />
]

const AppMiningPage = () => (
  <MiningPage>
    <Head
      title="App Mining"
      description="Earn BTC for apps you build with Blockstack. We are funding decentralized app teams simply for being pioneers in the space."
    />
    <Watch top>
      <Header />
    </Watch>
    {sections.map((PageSection, i) => <Watch key={i}>{PageSection}</Watch>)}
  </MiningPage>
)

export default AppMiningPage
