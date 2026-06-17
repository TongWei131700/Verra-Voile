import { useParallax } from '../hooks/useScrollAnimations'
import Navbar from '../components/Navbar'
import ScrollProgress from '../components/ScrollProgress'
import FloatingDecor from '../components/FloatingDecor'
import Hero from '../components/Hero'
import Story from '../components/Story'
import Venue from '../components/Venue'
import Destinations from '../components/Destinations'
import Schedule from '../components/Schedule'
import Gallery from '../components/Gallery'
import RSVP from '../components/RSVP'
import Footer from '../components/Footer'
import FloatingCTA from '../components/FloatingCTA'

export default function Home() {
  useParallax()

  return (
    <>
      <Navbar />
      <ScrollProgress />
      <FloatingDecor />
      <Hero />
      <Story />
      <Venue />
      <Destinations />
      <Schedule />
      <Gallery />
      <RSVP />
      <Footer />
      <FloatingCTA />
    </>
  )
}
