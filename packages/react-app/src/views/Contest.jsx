import { PageHeader } from "antd";
import { useParams, useHistory, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Button, Divider, Table, Space, Typography, Input, Image } from "antd";
import { fromWei, toWei, toBN, numberToHex } from "web3-utils";
import { Address, PayButton } from "../components";
import { ethers } from "ethers";
import qs from "query-string";
import { PlusSquareOutlined, MinusSquareOutlined, SendOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dips from "../dips";

const { Text } = Typography;

var Map = require("collections/map");

export default function Contest({
  address,
  mainnetProvider,
  blockExplorer,
  localProvider,
  userSigner,
  tx,
  readContracts,
  writeContracts,
  yourLocalBalance,
}) {
  /***** Routes *****/
  const routeHistory = useHistory();
  let { id } = useParams();
  const location = useLocation();

  /***** States *****/
  const [qdipHandler, setQdipHandler] = useState();
  const [electionState, setElectionState] = useState({});
  const [tableSrc, setTableSrc] = useState([]);
  const [candidateMap, setCandidateMap] = useState();
  const [votesLeft, setVotesLeft] = useState(0);
  const [spender, setSpender] = useState("");
  const [isElectionEnding, setIsElectionEnding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const endElection = async () => {
    setIsElectionEnding(true);
    const result = qdipHandler.endElection(id);
  };

  /***** Effects *****/
  useEffect(() => {
    if (readContracts) {
      if (readContracts.Diplomat) {
        init();
      }
    }
  }, [readContracts, address]);

  useEffect(async () => {
    if (qdipHandler) {
      await loadElectionState();
    }
  }, [qdipHandler]);

  useEffect(() => {
    (async () => {
      if (electionState && electionState.name) {
        updateTableSrc();
      }
    })();
  }, [electionState, address]);

  const init = async () => {
    console.log("init");
    const { kind } = qs.parse(location.search);
    setQdipHandler(dips[kind].handler(tx, readContracts, writeContracts, mainnetProvider, address, userSigner));
    setSpender(readContracts?.Diplomat?.address);
  };

  const loadElectionState = async () => {
    let electionState = await qdipHandler.getElectionStateById(id);
    setElectionState(electionState);
  };

  const updateTableSrc = async () => {
    let data = [
      {
        address: "0x76c48E1F02774C40372a3497620D946136136172",
        entry: "test",
      },
    ];
    setTableSrc(data);
    if (electionState.candidates) {
      const mapping = new Map();
      for (let i = 0; i < electionState.candidates.length; i++) {
        mapping.set(electionState.candidates[i], { votes: 0, score: 0 });
      }
      setCandidateMap(mapping);
    }
  };

  /***** UI Events *****/
  const uploadMeme = async () => {
    let memeUrl = "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png";
    console.log({ id });
    let result = await qdipHandler.addCandidate(id);
  };

  const minusVote = addr => {
    const candidate = candidateMap.get(addr);
    if (candidate.votes > 0) {
      candidate.votes = candidate.votes - 1;
      candidate.score = (candidate.votes ** 0.5).toFixed(2);
      candidateMap.set(addr, candidate);
      setVotesLeft(votesLeft + 1);
      setErrorMsg(null);
    }
  };

  const addVote = addr => {
    const candidate = candidateMap.get(addr);
    if (candidate.votes < electionState.voteAllocation && votesLeft > 0) {
      candidate.votes = candidate.votes + 1;
      candidate.score = (candidate.votes ** 0.5).toFixed(2);
      candidateMap.set(addr, candidate);
      setVotesLeft(votesLeft - 1);
      setErrorMsg(null);
    }
  };

  /***** Render *****/
  const uploadMemeBtn = (
    <>
      {electionState && electionState.active && (
        <Button
          icon={<CloseCircleOutlined />}
          type="warning"
          size="large"
          shape="round"
          style={{ margin: 4 }}
          onClick={() => uploadMeme()}
          loading={isUploading}
        >
          Upload Meme
        </Button>
      )}
    </>
  );

  const endElectionBtn = (
    <>
      {electionState && electionState.active && electionState.isAdmin && (
        <Button
          icon={<CloseCircleOutlined />}
          type="danger"
          size="large"
          shape="round"
          style={{ margin: 4 }}
          onClick={() => endElection()}
          loading={isElectionEnding}
        >
          End Contest
        </Button>
      )}
    </>
  );

  const payoutBtn = (
    <>
      {electionState && !electionState.active && electionState.isAdmin && !electionState.isPaid && (
        <PayButton
          token={"ETH"}
          tokenAddr={electionState.tokenAdr}
          appName="Quadratic Diplomacy"
          tokenListHandler={tokens => setAvailableTokens(tokens)}
          callerAddress={address}
          maxApproval={electionState.fundAmount}
          amount={electionState.fundAmount}
          spender={spender}
          yourLocalBalance={yourLocalBalance}
          readContracts={readContracts}
          writeContracts={writeContracts}
          ethPayHandler={ethPayHandler}
          tokenPayHandler={tokenPayHandler}
        />
      )}
    </>
  );

  const actionCol = () => {
    if (electionState.canVote) {
      return {
        title: "Vote",
        key: "action",
        render: (text, record, index) => (
          <>
            <Space size="middle">
              <Button
                icon={<MinusSquareOutlined />}
                type="link"
                size="large"
                onClick={() => minusVote(text.address)}
              ></Button>
              <Typography.Title level={4} style={{ margin: "0.1em" }}>
                {candidateMap && candidateMap.get(text.address).votes}
              </Typography.Title>
              <Button
                icon={<PlusSquareOutlined />}
                type="link"
                size="large"
                onClick={() => addVote(text.address)}
              ></Button>
            </Space>
          </>
        ),
      };
    } else {
      return {};
    }
  };

  const addressCol = () => {
    return {
      title: "Memelords",
      dataIndex: "address",
      key: "address",
      render: address => (
        <Address address={address} fontSize="14pt" ensProvider={mainnetProvider} blockExplorer={blockExplorer} />
      ),
    };
  };

  const entryCol = () => {
    return {
      title: "Entry",
      dataIndex: "entry",
      key: "entry",
      render: entry => (
        <Image width={200} src="https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png" />
      ),
    };
  };

  const makeTableCols = () => {
    if (electionState && electionState.active) {
      if (electionState.canVote) {
        return [addressCol(), entryCol(), actionCol()];
      } else {
        return [addressCol(), entryCol()];
      }
    } else {
      return [addressCol()];
    }
  };

  const tableCols = makeTableCols();

  return (
    <>
      <div
        className="voting-view"
        style={{ border: "1px solid #cccccc", padding: 16, width: 1200, margin: "auto", marginTop: 64 }}
      >
        <PageHeader
          ghost={false}
          onBack={() => routeHistory.push("/")}
          title={electionState && electionState.name ? electionState.name : "Loading Contest..."}
          extra={[uploadMemeBtn, payoutBtn]}
        ></PageHeader>
        <Table
          dataSource={tableSrc}
          columns={tableCols}
          pagination={false}
          onRow={(record, rowIndex) => {
            return {
              onClick: event => {}, // click row
              onDoubleClick: event => {}, // double click row
              onContextMenu: event => {}, // right button click row
              onMouseEnter: event => {}, // mouse enter row
              onMouseLeave: event => {}, // mouse leave row
            };
          }}
        />
      </div>
    </>
  );
}
