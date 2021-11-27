import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { useState, useEffect, useRef } from 'react';
import { Paper, Grid } from "@material-ui/core";
import TextField from '@material-ui/core/TextField';

const useStyles = makeStyles((theme) => ({
  root: {
    '& > *': {
      margin: theme.spacing(2),
      padding: theme.spacing(2)
    },
  },
  demo: {
      display: 'flex',
      flexWrap: 'wrap',
      '& > *': {
        margin: theme.spacing(1),
        width: theme.spacing(73)
      },
  },
  listItemText:{
    fontSize:'1em',
  },
  topicHeader: {
    padding: '1rem'
  },
  consumerText: {
    paddingTop: '6px'
  }
}));

function App(props) {
  const [consumer, setConsumer] = useState("person-v1.0");

  const [batchCount, setBatchCount] = useState(3)

  const [messages, setMessages] = useState({ "person-v1": [], "person-v2": [] });

  const [consumerRecords, setConsumerRecords] = useState({
    "person-v1.0": [], 
    "person-v1.1": [], 
    "person-v2.0": []});

  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://" + process.env.REACT_APP_BACKEND_ADDRESS + ":5678");
    ws.current.onopen = () => {
      console.log("ws opened");

      ws.current.send(JSON.stringify({
        type: "setup-connect"
      }))

      console.log("sent")
    }
    ws.current.onmessage = e => {
      const m = JSON.parse(e.data);
      console.log("received: ", m);
      if (m.display_area === "producer") {
        setMessages(prev => {
          let newObject =  {...prev}
          newObject[m.topic_name] = [...prev[m.topic_name], ...m.messages]
          return newObject;
        });
      }
      else {
        setConsumerRecords(prev => {
          let newObject = {...prev}
          newObject[m.display_area] = [...prev[m.display_area], ...m.messages]
          return newObject;
        });
      }
    };
    ws.current.onclose = () => console.log("ws closed");
    return () => {
        ws.current.close();
    };
  }, []);


  const handleClick = (topic_name, version) => {
      ws.current.send(JSON.stringify({
        type: "play-stream",
        batch_count: batchCount,
        stream_topic: topic_name,
        stream_version: version
      }))
  }

  const handleConsumer = (topic_name, version) => {
    setConsumer(topic_name + "." + version)
  }

  const classes = useStyles();

  return (
    <div className="App">
      <CssBaseline />
      <Container maxWidth="lg">
        <Paper>
          <div className={classes.root}>
          <h3>Consumer</h3>
          <Grid container>
            <label className={classes.consumerText}>Event payload as handled by Consumer</label>
            <Grid spacing={3} xs={9} container direction="row" justifyContent="flex-end" alignItems="center">
              <Grid item>
              <label>Version expected by Consumer: </label>
              </Grid>
              <Grid item>
                <Button 
                variant="contained" color="primary" 
                style={{ background :  consumer === "person-v1.0" ?  "#4CBB17"  : "#3f51b5" }} 
                onClick={() => handleConsumer("person-v1", "0")}>
                  1.0
                </Button>
              </Grid>
              <Grid item>
                <Button 
                variant="contained" color="primary" 
                style={{ background :  consumer === "person-v1.1" ?  "#4CBB17"  : "#3f51b5" }} 
                onClick={() => handleConsumer("person-v1", "1")}>
                  1.1 
                </Button>
              </Grid>
              <Grid item>
                <Button 
                variant="contained" color="primary" 
                style={{ background :  consumer === "person-v2.0" ?  "#4CBB17"  : "#3f51b5" }} 
                onClick={() => handleConsumer("person-v2", "0")}>
                  2.0 
                </Button>
                </Grid>
            </Grid>
          </Grid>
          <div className={classes.topicHeader}>
          <Paper style={{maxHeight: 200, overflow: 'auto'}}>
              <List>
                <List>
                  { consumerRecords[consumer].map((item,index) => 
                    <ListItem key={index}>
                      <ListItemText 
                        classes={{primary:classes.listItemText}}
                        primary={ 
                          <div className={classes.listItemText}>
                            <span>[ { item.timestamp } ]</span>
                            { (item.version.startsWith("W")) ?  
                            (<span style={{ fontWeight: "bold", color: "#FF0000" }}>{ item.version }</span>) :
                            (<span style={{ fontWeight: "bold"}}>{ item.version }</span>) }
                            <span>{ " {" + "\"name\" : \"" + item.name + "\"" }</span>
                            <span>{ (item.age ? (", \"age\": \"" + item.age + "\"") : "") }</span>
                            <span>{ (typeof item.is_adult === "boolean" ? (", \"is_adult\": \"" + item.is_adult + "\"") : "") }</span>
                            <span>{ (item.address ? (", \"address\": \"" + item.address + "\"") : "") + "}" }</span>
                          </div>
                      }
                      />
                    </ListItem>
                  )}
                </List>
              </List>
            </Paper>
          </div>
          </div>
        </Paper>
        <Paper>
          <div className={classes.root}>
          <h3>Producer</h3>
          <Grid container>
            <TextField 
                id="message-count" 
                value={batchCount} 
                size="small" 
                helperText="Number of messages to publish" 
                onChange={(e) => setBatchCount(e.target.value)}  />
            <Grid spacing={3} xs={9} container direction="row" justifyContent="flex-end" alignItems="center">
              <Grid item>
              <label>Version for publishing: </label>
              </Grid>
              <Grid item>
                <Button variant="contained" color="primary" onClick={() => handleClick("person-v1", "1")}>
                  1.0
                </Button>
              </Grid>
              <Grid item>
                <Button variant="contained" color="primary" onClick={() => handleClick("person-v1", "2")}>
                  1.1
                </Button>
              </Grid>
              <Grid item>
                <Button variant="contained" color="primary" onClick={() => handleClick("person-v2", "na")}>
                  2.0 
                </Button>
                </Grid>
            </Grid>
          </Grid>
          </div>
        </Paper>
        <Paper className={classes.topicHeader}>
        <h3 className={classes.topicHeader}>Kafka Topics</h3>
        <div className={classes.demo} >
          {
            Object.keys(messages).map((key, m_index) => 
            <Paper style={{maxHeight: 200, overflow: 'auto'}}>
              <h4 className={classes.topicHeader}>{"Topic " + key}</h4>
              <List>
                { messages[key].map((item,index) => 
                  <ListItem key={index}>
                    <ListItemText 
                      classes={{primary:classes.listItemText}}
                      primary={ 
                        <div className={classes.listItemText}>
                            <span>[ { item.timestamp } ]</span>
                            { (item.version.startsWith("W")) ?  
                            (<span style={{ fontWeight: "bold", color: "#FF0000" }}>{ item.version }</span>) :
                            (<span style={{ fontWeight: "bold"}}>{ item.version }</span>) }
                            <span>{ " {" + "\"name\" : \"" + item.name + "\"" }</span>
                            <span>{ (item.age ? (", \"age\": \"" + item.age + "\"") : "") }</span>
                            <span>{ (typeof item.is_adult === "boolean" ? (", \"is_adult\": \"" + item.is_adult + "\"") : "") }</span>
                            <span>{ (item.address ? (", \"address\": \"" + item.address + "\"") : "") + "}" }</span>
                        </div>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </Paper>
            )
          }
        </div>
        </Paper>
      </Container>
    </div>
  );
}

export default App;
