import React, { Component } from 'react'
import Audit from './Audit'
import { LogTypes, checkForOldSession } from '../utils/helpers'

import {
  Pane,
  TextInputField,
  Heading,
  Text,
  Button,
  SelectMenu,
  Table,
  Checkbox,
  Dialog
} from "evergreen-ui";

class PoA extends Component {
  state = {
    events: null,
    selectedEventName: "",
    selectedEventId: "",
    selectedEventQr: "",
    attendees: null,
    checkAll: false,
    dialogVisible: false
  };

  componentDidMount() {
    if (this.state.events == null) {
      console.log(this.state.events);
      this.getEvents(null);
    }
  }

  refreshIfNeeded = async () => {
    await checkForOldSession(
      this.props.state.app.lastLoadTimestamp,
      this.props.updateState
    );
  };

  loadEventAttendees = async (eventId) => {
    let response = await fetch(`/award/${eventId}`);
    let body = await response.json();
    let attendees = body.attendees.map((attendee) => {
      return {
        created: attendee.createdAt,
        name: attendee.user.name,
        address: attendee.user.address,
        userId: attendee.user._id,
        checked: false
      };
    });

    this.setState({ attendees: attendees });
  };

  getEvents = async (event) => {
    if (event !== null) {
      event.preventDefault();
    }

    let response = await fetch("/events");
    let body = await response.json();

    let events = body
      .sort((e1, e2) => {
        return e1.createdAt > e2.createdAt ? -1 : 1;
      })
      .map((e) => {
        return {
          id: e._id,
          eventName: e.eventName,
          created: e.createdAt
        };
      });

    this.setState({
      events: events
    });
  };

  bulkAwardTokens = async (event) => {
    event.preventDefault();
    // document.getElementById("bulkAwardButton").disabled = true;

    let web3 = this.props.state.web3;

    let addresses = this.state.attendees
      .filter((attendee) => {
        return attendee.checked;
      })
      .map((attendee) => {
        return attendee.address;
      });

    let amounts = String(event.target.amounts.value)
      .split(",")
      .map((amount) => web3.toWei(amount, "ether"));
    let reason = event.target.reason.value;

    if (addresses.length === 0 || amounts.length === 0 || reason.length === 0) {
      this.props.updateState(
        "All details must be filled in to award tokens",
        "",
        2
      );
      return;
    }

    await this.refreshIfNeeded();

    // Record the award details on IPFS audit log
    let auditInstance = new Audit(this.props);
    let timeStamp = Date.now();
    let ipfsHash = await auditInstance.recordBulkAward(
      timeStamp,
      addresses,
      amounts,
      reason
    );
    this.props.updateLoadingMessage(
      "Entry added to IPFS audit file successfully",
      "Please confirm the ethereum transaction via your wallet and wait for it to confirm.",
      0
    );

    // Make contract changes and attach the IPFS hash permanently to an admin tx record (and to the events log)
    let khanaTokenInstance = this.props.state.contract.instance;
    let accounts = this.props.state.user.accounts;

    khanaTokenInstance
      .awardBulk(addresses, amounts, ipfsHash, timeStamp, {
        from: accounts[0],
        gas: 500000,
        gasPrice: web3.toWei(3, "gwei")
      })
      .then((txResult) => {
        this.props.updateLoadingMessage(
          "Waiting for transaction to confirm..."
        );

        let bulkAwardEvent = khanaTokenInstance.LogBulkAwardedSummary(
          { fromBlock: "latest" },
          (err, response) => {
            // Ensure we're not detecting old events in previous (i.e. the current) block. This bug is more relevant to dev environment where all recent blocks could be emitting this event, causing bugs.
            if (response.blockNumber >= txResult.receipt.blockNumber) {
              let message = "Transaction confirmed and tokens bulk awarded.";
              auditInstance.finaliseTx(
                response,
                ipfsHash,
                LogTypes.bulkAward,
                message
              );
              bulkAwardEvent.stopWatching();
              document.getElementById("bulkAwardButton").disabled = false;
            }
          }
        );
      })
      .catch((error) => {
        this.props.updateState("Bulk awarding error", error.message, 3);
        document.getElementById("bulkAwardButton").disabled = false;
      });
  };

  selectedEvent = async (item) => {
    let qrCodeUrl = (await fetch(`/eventCodes/${item.value}-poa.png`)).url;
    this.setState({
      selectedEventName: item.label,
      selectedEventId: item.value,
      selectedEventQr: qrCodeUrl
    });
    await this.loadEventAttendees(item.value);
  };

  setAttendeeCheck = async (e, index) => {
    let attendees = [...this.state.attendees];
    attendees[index].checked = e.target.checked;

    this.setState({ attendees: attendees });
  };

  setAllChecked = async (e) => {
    let attendees = this.state.attendees.map((attendee) => {
      attendee.checked = e.target.checked;
      return attendee;
    });
    this.setState({
      checkAll: e.target.checked,
      attendees: attendees
    });
  };

  newQRcode = async (event) => {
    event.preventDefault();
    let response = await fetch(
      `/create/${event.target.title.value}`
    );
    let body = response.body
    console.log(body)
    await this.getEvents(null);
  };

  render() {
    let events = this.state.events;
    let selectedEvent = this.state.selectedEventId;
    let attendees = this.state.attendees;

    return (
      <Pane padding={8} flex="1">
        <Pane
          padding={14}
          marginBottom={16}
          background="greenTint"
          borderRadius={5}
          border="default"
        >
          <Pane marginBottom={16}>
            <Heading>For existing events</Heading>
          </Pane>
          <Pane marginBottom={16}>
            {events == null ? (
              <Button
                marginRight={12}
                iconBefore="download"
                onClick={this.getEvents}
              >
                Load events...
              </Button>
            ) : (
              <SelectMenu
                title="Select existing event"
                options={events.map((event) => ({
                  label: event.eventName,
                  value: event.id
                }))}
                selected={this.state.selectedEventName}
                onSelect={(item) => this.selectedEvent(item)}
              >
                <Button>
                  {this.state.selectedEventName || "Select existing event..."}
                </Button>
              </SelectMenu>
            )}
          </Pane>
          {selectedEvent !== "" && (
            <Pane marginBottom={16}>
              <Dialog
                title={this.state.selectedEventName}
                isShown={this.state.dialogVisible}
                onCloseComplete={() => this.setState({ dialogVisible: false })}
                hasFooter={false}
                hasHeader={true}
              >
                <Pane
                  alignItems="center"
                  justifyContent="center"
                  display="flex"
                >
                  <img
                    src={this.state.selectedEventQr}
                    alt="QR code"
                    style={{ width: 400, height: 400 }}
                  />
                </Pane>
              </Dialog>
              <Button
                marginRight={12}
                iconBefore="barcode"
                onClick={() => this.setState({ dialogVisible: true })}
              >
                Show QR code
              </Button>
            </Pane>
          )}
          {events !== null && attendees !== null && attendees.length !== 0 && (
            <Pane marginBottom={16}>
              <Heading marginBottom={16}>
                Select community members to award tokens
              </Heading>
              <Table>
                <Table.Head>
                  <Table.TextHeaderCell>
                    <Checkbox
                      label="Name"
                      checked={this.state.checkAll}
                      onChange={(e) => this.setAllChecked(e)}
                    />
                  </Table.TextHeaderCell>
                  <Table.TextHeaderCell>Address</Table.TextHeaderCell>
                  <Table.TextHeaderCell>Timestamp</Table.TextHeaderCell>
                </Table.Head>
                <Table.Body>
                  {attendees.map((attendee, index) => (
                    <Table.Row key={attendee.userId}>
                      <Table.TextCell>
                        <Checkbox
                          label={
                            attendee.name && attendee.name.length > 0
                              ? attendee.name
                              : "(No name given)"
                          }
                          checked={attendee.checked}
                          onChange={(e) => this.setAttendeeCheck(e, index)}
                        />
                      </Table.TextCell>
                      <Table.TextCell>{attendee.address}</Table.TextCell>
                      <Table.TextCell>{`${new Date(
                        attendee.created
                      )}`}</Table.TextCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </Pane>
          )}
          {events !== null && attendees !== null && attendees.length === 0 && (
            <Text>No attendee records for event</Text>
          )}
          {events !== null && attendees !== null && attendees.length !== 0 && (
            <Pane>
              <form onSubmit={this.bulkAwardTokens} id="bulkAwardTokens">
                <TextInputField
                  label={
                    "Amount of " +
                    this.props.state.contract.tokenSymbol +
                    " to award each person"
                  }
                  placeholder="0.0"
                  htmlFor="bulkAwardTokens"
                  type="number"
                  name="amounts"
                  required
                />
                <TextInputField
                  label="Details of award granting"
                  placeholder="Proof of Attendance for meetup event on DD/MM/YYYY"
                  htmlFor="bulkAwardTokens"
                  type="text"
                  name="reason"
                  required
                />
                <Button type="submit" id="bulkAwardButton" marginLeft={8}>
                  Make token award
                </Button>
              </form>
            </Pane>
          )}
        </Pane>

        <Pane
          padding={14}
          marginBottom={16}
          background="yellowTint"
          borderRadius={5}
          border="default"
        >
          <Heading marginBottom={16}>For new events</Heading>
          <Pane marginBottom={16}>
            <form onSubmit={this.newQRcode} id="newQRcode">
              <TextInputField
                label="What is the title of the event?"
                placeholder="E.g. BUIDL Amsterdam 12"
                htmlFor="newQRcode"
                type="text"
                name="title"
                required
              />
              <Button
                type="submit"
                id="newQRcode"
                marginRight={12}
                iconBefore="plus"
              >
                Create new QR code
              </Button>
            </form>
          </Pane>
        </Pane>
      </Pane>
    );
  }
}

export default PoA;



