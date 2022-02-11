import React, {useState, useEffect, useReducer} from "react";
import axios from "axios"
import { Routes, Route, Link, Outlet, useSearchParams, useNavigate } from "react-router-dom";

function App() {
  return (
    <div className="App">
      <h1>Trade Automaton</h1>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} >
        <Route path="newTrade" element={<NewTrade/>} />
          <Route path="trades" element={<Trades/>} />
          </Route>
        <Route path="api/redirect_url_kite" element={<Transient />} >
          
        </Route>
      </Routes>
    </div>
  );
}

function Home() {
  const [loginUrl, setLoginUrl] = useState("")

  async function getLogin() {
    try {
      const response = await axios.get("http://localhost:3001/login/url")
      const url = response.data.sessionValid ? "dashboard" : response.data.url
      setLoginUrl(url)
    } catch(error) {
      console.log("Error getting login info ", error)
    }
  }
  getLogin()

  return (
    <>
      <main>
      </main>
      <a href={loginUrl}>Login</a>
    </>
  );
}

function Transient() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestToken = searchParams.get("request_token")
  const navigate = useNavigate();
  useEffect( () => {
    async function postToken() {
      try {
        if (requestToken) {
          console.log("posting token request ", requestToken)
          const response = await axios.post("http://localhost:3001/login/token", {requestToken})
          if (response.status  === 200) {
            console.log("token posted successfully")            
            navigate("/dashboard")
          }
        } else {
          console.log("invalid request token")
          navigate("/")
        }
      } catch(error) {
        console.log("Error with broker setup ", error)
        navigate("/")
      }
    } 
    postToken();
  }, [requestToken, navigate])

  return <></>

}

function Dashboard() {
  const [spotPrice, setSpotPrice] = useState([0,0])
  useEffect( () => {
    async function setup() {
      try {        
        const response = await axios.get("http://localhost:3001/spot")
        console.log(response)
        setSpotPrice(response.data.price)

      } catch(error) {
        console.log("Error with broker setup ", error)
      }
    } setup();
  }, [])
  return (
    <div>
    <h4>Spot Prices</h4>
      <p>NIFTY: {spotPrice[0]}<br/>BANK NIFTY: {spotPrice[1]}</p>
      <nav style={{
          borderBottom: 'solid 1px',
          paddingBottom: '1rem',
        }}>
      <Link to="/dashboard/newtrade">NewTrade</Link> |{' '}
      <Link to="/dashboard/trades">Trades</Link>
      </nav>
      <Outlet />
    </div>
  )

}

function Trades() {
  return (
    <div>
      <h4>You don't have any trades yet!!</h4>
    </div>
  )
}

function NewTrade() {
  const NIFTY = "NIFTY"
  const BANKNIFTY = "BANKNIFTY"
  const FIXEDSL = "FIXED"
  const COMBINEDSL = "COMBINED"
  const MIS = "MIS"
  const NRML = "NRML"
  
  const [state, dispatch] = useReducer(reducer,
                    {product: MIS, instrument: NIFTY, lots:2, skew:10, timeout:5, sltype: COMBINEDSL, sl:20, sll:1})

  function reducer(state, action) {
    switch (action.type) {
      case 'product':
      case 'instrument':
      case 'lots':
      case 'skew':
      case 'timeout':
      case 'sltype':
      case 'sl':
      case 'sll':
        return {...state, [action.type]:action.payload}
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }

  }

  

  function postOrder(event) {
    event.preventDefault()
    const obj = state
    axios.post("http://localhost:3001/atmStraddle", obj)
      .then(response => console.log("order placed"))
  }

  return (
    <>
      <main>
      <h2>ATM Short Straddle</h2>
      <div>
      <h4>Product</h4>
        MIS <input type="radio" checked={state.product === MIS}
              value={state.product} onChange={()=>dispatch({type: 'product', payload:MIS})} />
        NRML <input type="radio" checked={state.product === NRML}
              value={state.product} onChange={()=>dispatch({type: 'product', payload:NRML})} />
      </div>
      <div>
      <h4>Instrument</h4>
        NIFTY <input type="radio" checked={state.instrument === NIFTY}
              value={state.instrument} onChange={()=>dispatch({type: 'instrument', payload:NIFTY})} />
        BANKNIFTY <input type="radio" checked={state.instrument === BANKNIFTY}
              value={state.instrument} onChange={()=>dispatch({type: 'instrument', payload:BANKNIFTY})} />
      </div>
      <h4>Lots & Skew</h4>
      <div># Lots <input value={state.lots} onChange={(event)=>dispatch({type: 'lots', payload:event.target.value})}></input></div>
      <div>Skew % <input value={state.skew} onChange={(event)=>dispatch({type: 'skew', payload:event.target.value})}></input></div>
      <div>Skew Timeout (Minutes) <input value={state.timeout} onChange={(event)=>dispatch({type: 'timeout', payload:event.target.value})}></input></div>
      <div>
      <h4>Stop Loss</h4>
        Fixed SL <input type="radio" checked={state.sltype === FIXEDSL}
              value={state.sltype} onChange={()=>dispatch({type: 'sltype', payload:FIXEDSL})} />
        Combined SL <input type="radio" checked={state.sltype === COMBINEDSL}
              value={state.sltype} onChange={()=>dispatch({type: 'sltype', payload:COMBINEDSL})} />
      </div>
      <div>SL % <input value={state.sl} onChange={(event)=>dispatch({type: 'sl', payload:event.target.value})}></input></div>
      <div>SLL % <input value={state.sll} onChange={(event)=>dispatch({type:'sll', payload: event.target.value})}></input></div>
      <br></br>
      <form onSubmit={(event)=>postOrder(event)}>
        <button type="submit">Submit</button>
      </form>
      </main>
    </>
  );
}

export default App;
