import { Warp } from '@paper-design/shaders-react'

export default function SilkShaderBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true">
      <Warp
        width={1280}
        height={720}
        colors={['#7e5d98', '#f5f0e5', '#7e5d98', '#121212']}
        proportion={0.45}
        softness={1}
        distortion={0.25}
        swirl={0.8}
        swirlIterations={10}
        shape="checks"
        shapeScale={0.1}
        speed={1}
        style={{ width: '100%', height: '100%' }}
      />
      {/* Camada de escurecimento para melhorar legibilidade do texto */}
      <div className="absolute inset-0 bg-brand-purple-dark/60 dark:bg-brand-purple-dark/75" />
    </div>
  )
}