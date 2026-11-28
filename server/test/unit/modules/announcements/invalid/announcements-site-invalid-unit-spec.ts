import { LayerFixture } from '../../../../config/layer-harness';
import {
  ANNOUNCEMENTS_PATH,
  VALID_ANNOUNCEMENT as VALID,
  describeAnnouncementTable,
  useAnnouncementsApp,
} from '../announcements-site-support';
import {
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementState,
} from '../../../../../src/infastructures/prisma/common/client';

/** Each fixture keeps every other field valid. */

const ALL_AUDIENCES = Object.values(AnnouncementAudience);
const ALL_CHANNELS = Object.values(AnnouncementChannel);

const MESSAGES = {
  titleRequired: 'Title is required',
  titleCharacters: 'Title may only contain letters, numbers, spaces and basic punctuation',
  titleRepeated: 'Title cannot contain repeated punctuation',
  titleColon: 'A colon before a word in the title must be followed by a space',
  titleEncoded: 'Title cannot contain encoded values',
  bodyRequired: 'Message is required',
  bodyControl: 'Message cannot contain control characters',
  audienceRequired: 'Pick at least one audience',
  channelRequired: 'Pick at least one channel',
  expiryOrder: 'Expiry must come after the publish time',
  windowId: 'A valid maintenance window id is required',
};

/** Every field is required, nullable ones included. */
const without = (field: keyof typeof VALID) => {
  const { [field]: _omitted, ...rest } = VALID;
  return rest;
};

const titleFixtures: LayerFixture[] = [
  { name: 'Staff leaves the title out', input: without('title'), expected: 'FAIL', field: 'title' },
  { name: 'Staff leaves the title empty', input: { ...VALID, title: '' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleRequired },
  { name: 'Staff types a title of only spaces', input: { ...VALID, title: '   ' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleRequired },
  { name: 'Staff types a title of 201 characters', input: { ...VALID, title: 'a'.repeat(201) }, expected: 'FAIL', field: 'title' },
  { name: 'Staff types a title with an emoji', input: { ...VALID, title: 'Outreach day 🎉' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleCharacters },
  { name: 'Staff types a title with double quotes', input: { ...VALID, title: 'Read the "Volunteer FAQ" first' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleCharacters },
  { name: 'Staff types a title with a hash sign (Room #3)', input: { ...VALID, title: 'Briefing in Room #3' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleCharacters },
  { name: 'Staff types a title with an underscore', input: { ...VALID, title: 'Outreach_day schedule' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleCharacters },
  { name: 'Staff types a title over two lines', input: { ...VALID, title: 'Outreach day\nBring water' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleCharacters },
  { name: 'Staff types a title ending in repeated exclamation marks', input: { ...VALID, title: 'Volunteers needed!!!' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleRepeated },
  { name: 'Staff types a title with a double hyphen', input: { ...VALID, title: 'Outreach -- Barangay Guadalupe' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleRepeated },
  { name: 'Staff types a title with empty parentheses', input: { ...VALID, title: 'Schedule update ()' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleRepeated },
  { name: 'Staff types a title with a colon run into a word', input: { ...VALID, title: 'Reminder:bring your ID' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleColon },
  { name: 'Staff types a title with a percent-encoded value (%20)', input: { ...VALID, title: 'Outreach%20day' }, expected: 'FAIL', field: 'title', message: MESSAGES.titleEncoded },
  { name: 'Staff sends the title as a number', input: { ...VALID, title: 2026 }, expected: 'FAIL', field: 'title' },
];

const bodyFixtures: LayerFixture[] = [
  { name: 'Staff leaves the message out', input: without('body'), expected: 'FAIL', field: 'body' },
  { name: 'Staff leaves the message empty', input: { ...VALID, body: '' }, expected: 'FAIL', field: 'body', message: MESSAGES.bodyRequired },
  { name: 'Staff types a message of only spaces and line breaks', input: { ...VALID, body: ' \n\t \r\n ' }, expected: 'FAIL', field: 'body', message: MESSAGES.bodyRequired },
  { name: 'Staff types a message of 4001 characters', input: { ...VALID, body: 'a'.repeat(4001) }, expected: 'FAIL', field: 'body' },
  { name: 'Staff pastes a non-printing character (bell) into the message', input: { ...VALID, body: `${VALID.body}\u0007` }, expected: 'FAIL', field: 'body', message: MESSAGES.bodyControl },
  { name: 'Staff pastes a form-feed character into the message', input: { ...VALID, body: 'Page one\u000Cpage two' }, expected: 'FAIL', field: 'body', message: MESSAGES.bodyControl },
  { name: 'Staff pastes a delete character into the message', input: { ...VALID, body: `${VALID.body}\u007F` }, expected: 'FAIL', field: 'body', message: MESSAGES.bodyControl },
  { name: 'Staff sends the message as a number', input: { ...VALID, body: 42 }, expected: 'FAIL', field: 'body' },
  { name: 'Client sends the message as "message" instead of "body"', input: { ...without('body'), message: VALID.body }, expected: 'FAIL', field: 'body' },
];

const toneFixtures: LayerFixture[] = [
  { name: 'Staff leaves the tone out', input: without('tone'), expected: 'FAIL', field: 'tone' },
  { name: 'Staff picks a tone that does not exist (URGENT)', input: { ...VALID, tone: 'URGENT' }, expected: 'FAIL', field: 'tone' },
  { name: 'Staff sends the tone in lower case (info)', input: { ...VALID, tone: 'info' }, expected: 'FAIL', field: 'tone' },
  { name: 'Staff sends an empty tone', input: { ...VALID, tone: '' }, expected: 'FAIL', field: 'tone' },
  { name: 'Staff sends the tone as a list', input: { ...VALID, tone: ['INFO'] }, expected: 'FAIL', field: 'tone' },
];

const audienceFixtures: LayerFixture[] = [
  { name: 'Staff leaves the audiences out', input: without('audiences'), expected: 'FAIL', field: 'audiences' },
  { name: 'Staff picks no audience', input: { ...VALID, audiences: [] }, expected: 'FAIL', field: 'audiences', message: MESSAGES.audienceRequired },
  { name: 'Staff picks an audience that does not exist (EVERYONE)', input: { ...VALID, audiences: ['EVERYONE'] }, expected: 'FAIL', field: 'audiences.0' },
  { name: 'Staff sends an audience in lower case (volunteers)', input: { ...VALID, audiences: ['volunteers'] }, expected: 'FAIL', field: 'audiences.0' },
  { name: 'Staff picks a role name instead of an audience (VOLUNTEER)', input: { ...VALID, audiences: ['VOLUNTEER'] }, expected: 'FAIL', field: 'audiences.0' },
  {
    name: 'Staff picks one unknown audience among valid ones',
    input: { ...VALID, audiences: [AnnouncementAudience.VOLUNTEERS, 'EVERYONE'] },
    expected: 'FAIL',
    field: 'audiences.1',
  },
  { name: 'Staff sends one audience as text instead of a list', input: { ...VALID, audiences: AnnouncementAudience.VOLUNTEERS }, expected: 'FAIL', field: 'audiences' },
  {
    name: `Staff sends ${ALL_AUDIENCES.length + 1} audiences, one more than exist`,
    input: { ...VALID, audiences: [...ALL_AUDIENCES, ALL_AUDIENCES[0]] },
    expected: 'FAIL',
    field: 'audiences',
  },
  { name: 'Staff sends the audiences as null', input: { ...VALID, audiences: null }, expected: 'FAIL', field: 'audiences' },
];

const channelFixtures: LayerFixture[] = [
  { name: 'Staff leaves the channels out', input: without('channels'), expected: 'FAIL', field: 'channels' },
  { name: 'Staff picks no channel', input: { ...VALID, channels: [] }, expected: 'FAIL', field: 'channels', message: MESSAGES.channelRequired },
  { name: 'Staff picks a channel that does not exist (SMS)', input: { ...VALID, channels: ['SMS'] }, expected: 'FAIL', field: 'channels.0' },
  { name: 'Staff sends a channel in lower case (portal)', input: { ...VALID, channels: ['portal'] }, expected: 'FAIL', field: 'channels.0' },
  {
    name: 'Staff picks one unknown channel among valid ones',
    input: { ...VALID, channels: [AnnouncementChannel.PORTAL, 'SMS'] },
    expected: 'FAIL',
    field: 'channels.1',
  },
  { name: 'Staff sends one channel as text instead of a list', input: { ...VALID, channels: AnnouncementChannel.PORTAL }, expected: 'FAIL', field: 'channels' },
  {
    name: `Staff sends ${ALL_CHANNELS.length + 1} channels, one more than exist`,
    input: { ...VALID, channels: [...ALL_CHANNELS, ALL_CHANNELS[0]] },
    expected: 'FAIL',
    field: 'channels',
  },
  { name: 'Staff sends the channels as null', input: { ...VALID, channels: null }, expected: 'FAIL', field: 'channels' },
];

const stateFixtures: LayerFixture[] = [
  { name: 'Staff leaves the state out', input: without('state'), expected: 'FAIL', field: 'state' },
  // Editor offers only draft/schedule; publish and take-down use the state endpoint.
  { name: 'Staff saves the notice straight as PUBLISHED', input: { ...VALID, state: AnnouncementState.PUBLISHED }, expected: 'FAIL', field: 'state' },
  { name: 'Staff saves the notice straight as EXPIRED', input: { ...VALID, state: AnnouncementState.EXPIRED }, expected: 'FAIL', field: 'state' },
  { name: 'Staff sends the state in lower case (draft)', input: { ...VALID, state: 'draft' }, expected: 'FAIL', field: 'state' },
  { name: 'Staff picks a state that does not exist (ARCHIVED)', input: { ...VALID, state: 'ARCHIVED' }, expected: 'FAIL', field: 'state' },
  { name: 'Staff sends an empty state', input: { ...VALID, state: '' }, expected: 'FAIL', field: 'state' },
];

const publishAtFixtures: LayerFixture[] = [
  { name: 'Staff leaves the publish time out', input: without('publish_at'), expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sends the publish time as null', input: { ...VALID, publish_at: null }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sends an empty publish time', input: { ...VALID, publish_at: '' }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sets the publish time as a date without a time', input: { ...VALID, publish_at: '2099-01-01' }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sets the publish time as a time without a date', input: { ...VALID, publish_at: '08:00:00' }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sets the publish time with a local offset (+08:00)', input: { ...VALID, publish_at: '2099-01-01T16:00:00+08:00' }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sets the publish time in a month that does not exist (13)', input: { ...VALID, publish_at: '2099-13-01T08:00:00.000Z' }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sets the publish time on a day that does not exist (30 February)', input: { ...VALID, publish_at: '2099-02-30T08:00:00.000Z' }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sets the publish time at an hour that does not exist (25:00)', input: { ...VALID, publish_at: '2099-01-01T25:00:00.000Z' }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sets the publish time in day/month/year form', input: { ...VALID, publish_at: '01/01/2099 08:00' }, expected: 'FAIL', field: 'publish_at' },
  { name: 'Staff sends the publish time as a timestamp number', input: { ...VALID, publish_at: 4070908800000 }, expected: 'FAIL', field: 'publish_at' },
];

const expiresAtFixtures: LayerFixture[] = [
  { name: 'Staff leaves the expiry out (null is required for "no expiry")', input: without('expires_at'), expected: 'FAIL', field: 'expires_at' },
  { name: 'Staff sets the expiry equal to the publish time', input: { ...VALID, expires_at: VALID.publish_at }, expected: 'FAIL', field: 'expires_at', message: MESSAGES.expiryOrder },
  { name: 'Staff sets the expiry before the publish time', input: { ...VALID, expires_at: '2098-12-31T08:00:00.000Z' }, expected: 'FAIL', field: 'expires_at', message: MESSAGES.expiryOrder },
  { name: 'Staff sets the expiry one second before the publish time', input: { ...VALID, expires_at: '2099-01-01T07:59:59.000Z' }, expected: 'FAIL', field: 'expires_at', message: MESSAGES.expiryOrder },
  { name: 'Staff sends an empty expiry', input: { ...VALID, expires_at: '' }, expected: 'FAIL', field: 'expires_at' },
  { name: 'Staff sets the expiry as a date without a time', input: { ...VALID, expires_at: '2099-01-02' }, expected: 'FAIL', field: 'expires_at' },
  { name: 'Staff sets the expiry with a local offset (+08:00)', input: { ...VALID, expires_at: '2099-01-02T16:00:00+08:00' }, expected: 'FAIL', field: 'expires_at' },
  { name: 'Staff sets the expiry on a day that does not exist (31 April)', input: { ...VALID, expires_at: '2099-04-31T08:00:00.000Z' }, expected: 'FAIL', field: 'expires_at' },
  { name: 'Staff sets the expiry in day/month/year form', input: { ...VALID, expires_at: '02/01/2099 08:00' }, expected: 'FAIL', field: 'expires_at' },
  { name: 'Staff sends the expiry as a timestamp number', input: { ...VALID, expires_at: 4070995200000 }, expected: 'FAIL', field: 'expires_at' },
];

const pinnedFixtures: LayerFixture[] = [
  { name: 'Staff leaves the pinned flag out', input: without('pinned'), expected: 'FAIL', field: 'pinned' },
  { name: 'Staff sends pinned as the text "true"', input: { ...VALID, pinned: 'true' }, expected: 'FAIL', field: 'pinned' },
  { name: 'Staff sends pinned as the text "yes"', input: { ...VALID, pinned: 'yes' }, expected: 'FAIL', field: 'pinned' },
  { name: 'Staff sends pinned as the number 1', input: { ...VALID, pinned: 1 }, expected: 'FAIL', field: 'pinned' },
  { name: 'Staff sends pinned as null', input: { ...VALID, pinned: null }, expected: 'FAIL', field: 'pinned' },
];

const windowIdFixtures: LayerFixture[] = [
  { name: 'Staff leaves the window id out (null is required for "no window")', input: without('window_id'), expected: 'FAIL', field: 'window_id' },
  { name: 'Staff sends an empty window id', input: { ...VALID, window_id: '' }, expected: 'FAIL', field: 'window_id', message: MESSAGES.windowId },
  { name: 'Staff sends a window id of 101 characters', input: { ...VALID, window_id: 'a'.repeat(101) }, expected: 'FAIL', field: 'window_id' },
  { name: 'Staff sends a window id with a space', input: { ...VALID, window_id: 'win db-migration' }, expected: 'FAIL', field: 'window_id', message: MESSAGES.windowId },
  { name: 'Staff sends a window id with an underscore', input: { ...VALID, window_id: 'win_db_migration' }, expected: 'FAIL', field: 'window_id', message: MESSAGES.windowId },
  { name: 'Staff sends a window id starting with a hyphen', input: { ...VALID, window_id: '-win-db' }, expected: 'FAIL', field: 'window_id', message: MESSAGES.windowId },
  { name: 'Staff sends a window id ending with a hyphen', input: { ...VALID, window_id: 'win-db-' }, expected: 'FAIL', field: 'window_id', message: MESSAGES.windowId },
  { name: 'Staff sends a window id with a double hyphen', input: { ...VALID, window_id: 'win--db' }, expected: 'FAIL', field: 'window_id', message: MESSAGES.windowId },
  { name: 'Staff sends a window id with a dot', input: { ...VALID, window_id: 'win.db' }, expected: 'FAIL', field: 'window_id', message: MESSAGES.windowId },
  { name: 'Staff sends a window id that is a hex literal (0x1f)', input: { ...VALID, window_id: '0x1f' }, expected: 'FAIL', field: 'window_id', message: MESSAGES.windowId },
  { name: 'Staff sends the window id as a number', input: { ...VALID, window_id: 42 }, expected: 'FAIL', field: 'window_id' },
];

const formFixtures: LayerFixture[] = [
  { name: 'Staff submits an empty form', input: {}, expected: 'FAIL', field: 'title' },
  { name: 'Client sends a field the dialog does not have (subject)', input: { ...VALID, subject: 'Extra' }, expected: 'FAIL' },
];

describe('announcements site · create — field validation', () => {
  const ctx = useAnnouncementsApp();

  describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
    describe('title', () => describeAnnouncementTable(ctx, titleFixtures));
    describe('body', () => describeAnnouncementTable(ctx, bodyFixtures));
    describe('tone', () => describeAnnouncementTable(ctx, toneFixtures));
    describe('audiences', () => describeAnnouncementTable(ctx, audienceFixtures));
    describe('channels', () => describeAnnouncementTable(ctx, channelFixtures));
    describe('state', () => describeAnnouncementTable(ctx, stateFixtures));
    describe('publish_at', () => describeAnnouncementTable(ctx, publishAtFixtures));
    describe('expires_at', () => describeAnnouncementTable(ctx, expiresAtFixtures));
    describe('pinned', () => describeAnnouncementTable(ctx, pinnedFixtures));
    describe('window_id', () => describeAnnouncementTable(ctx, windowIdFixtures));
    describe('form', () => describeAnnouncementTable(ctx, formFixtures));
  });
});
