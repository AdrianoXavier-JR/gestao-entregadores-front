import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

const entregadorIcon = new L.Icon({
  iconUrl: "/Entregador.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MoveMap({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [center, map]);

  return null;
}

function AnimatedMarker({ position, entregador }) {
  const markerRef = useRef();
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);
  return (
    <Marker ref={markerRef} position={position} icon={entregadorIcon}>
      <Popup>
        <strong>{entregador.nome}</strong>
        <br />
        Status: {entregador.status}
      </Popup>
    </Marker>
  );
}

function App() {
  const [entregador, setEntregador] = useState(null);
  const [posicaoAtual, setPosicaoAtual] = useState(null);
  const [pontosRota, setPontosRota] = useState([]);
  const [verdeCoords, setVerdeCoords] = useState([]);

  // ROTAS MOCKADAS
  const rotasMockadas = [
    [
      { id: 1, latitude: -23.560, longitude: -46.650, ordem: 1 },
      { id: 2, latitude: -23.561, longitude: -46.651, ordem: 2 },
      { id: 3, latitude: -23.562, longitude: -46.652, ordem: 3 },
      { id: 4, latitude: -23.563, longitude: -46.653, ordem: 4 },
    ],
    [
      { id: 1, latitude: -23.55052, longitude: -46.63331, ordem: 1 },
      { id: 2, latitude: -23.545, longitude: -46.62, ordem: 2 },
      { id: 3, latitude: -23.54, longitude: -46.61, ordem: 3 },
      { id: 4, latitude: -23.535, longitude: -46.60, ordem: 4 },
      { id: 5, latitude: -23.53, longitude: -46.59, ordem: 5 },
    ],
    [
      { id: 1, latitude: -23.580, longitude: -46.670, ordem: 1 },
      { id: 2, latitude: -23.575, longitude: -46.665, ordem: 2 },
      { id: 3, latitude: -23.570, longitude: -46.660, ordem: 3 },
      { id: 4, latitude: -23.565, longitude: -46.655, ordem: 4 },
    ],
  ];

  const rotaIndexRef = useRef(0);

  function simularNovaEntrega() {
    rotaIndexRef.current = (rotaIndexRef.current + 1) % rotasMockadas.length;
    const novaRota = rotasMockadas[rotaIndexRef.current];

    setPontosRota(novaRota);

    const novaPosicaoInicial = {
      lat: novaRota[0].latitude,
      lng: novaRota[0].longitude,
    };

    setPosicaoAtual(novaPosicaoInicial);
    setVerdeCoords([[novaPosicaoInicial.lat, novaPosicaoInicial.lng]]);
  }

  useEffect(() => {
    async function fetchEntregador() {
      try {
        const response = await axios.get(
          "http://localhost:8080/api/entregadores/6"
        );
        const dados = response.data;
        setEntregador(dados);

        const pontosOrdenados = [...dados.rota.pontos].sort(
          (a, b) => a.ordem - b.ordem
        );
        setPontosRota(pontosOrdenados);

        const posInicial = {
          lat: pontosOrdenados[0].latitude,
          lng: pontosOrdenados[0].longitude,
        };
        setPosicaoAtual(posInicial);
        setVerdeCoords([[posInicial.lat, posInicial.lng]]);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    }

    fetchEntregador();
  }, []);

  useEffect(() => {
    if (pontosRota.length < 2) return;

    let index = 0;
    const velocidade = 0.002;

    function animar(origem, destino) {
      let progress = 0;

      function passo() {
        progress += velocidade;

        if (progress >= 1) {
          index++;
          if (index < pontosRota.length - 1) {
            animar(pontosRota[index], pontosRota[index + 1]);
          }
          return;
        }

        const lat =
          origem.latitude + (destino.latitude - origem.latitude) * progress;
        const lng =
          origem.longitude + (destino.longitude - origem.longitude) * progress;

        setPosicaoAtual({ lat, lng });
        setVerdeCoords((prev) => [...prev, [lat, lng]]);

        requestAnimationFrame(passo);
      }

      passo();
    }

    animar(pontosRota[0], pontosRota[1]);
  }, [pontosRota]);

  if (!entregador || !posicaoAtual) return <p>Carregando mapa...</p>;

  const rotaCoords = pontosRota.map((p) => [p.latitude, p.longitude]);

  return (
    <>
      <button onClick={simularNovaEntrega} className="nova-entrega">
        Nova entrega
      </button>

      <MapContainer
        center={[posicaoAtual.lat, posicaoAtual.lng]}
        zoom={15}
        style={{ height: "100vh", width: "100%" }}
      >
        <MoveMap center={[posicaoAtual.lat, posicaoAtual.lng]} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <AnimatedMarker position={posicaoAtual} entregador={entregador} />

        {pontosRota.map((p, i) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              Checkpoint #{i + 1}
              <br />
              Lat: {p.latitude}
              <br />
              Lng: {p.longitude}
            </Popup>
          </Marker>
        ))}

        {rotaCoords.length >= 2 && (
          <Polyline positions={rotaCoords} color="blue" />
        )}

        {verdeCoords.length >= 2 && (
          <Polyline positions={verdeCoords} color="green" />
        )}
      </MapContainer>
    </>
  );
}

export default App;
