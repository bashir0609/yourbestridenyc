import { Button, Container } from '@/ui';

export default function NotFound() {
  return (
    <main id="main-content" className="interior-page">
      <Container>
        <p className="eyebrow">A DIFFERENT TURN</p>
        <h1>
          This stop isn’t
          <br />
          on the map.
        </h1>
        <p className="interior-intro">The page you’re looking for could not be found.</p>
        <Button href="/">Return home</Button>
      </Container>
    </main>
  );
}
