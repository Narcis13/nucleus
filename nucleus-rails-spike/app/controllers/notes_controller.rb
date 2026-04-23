class NotesController < ApplicationController
  before_action :set_note, only: %i[ show edit update destroy ]

  # GET /notes
  def index
    @notes = Note.all
  end

  # GET /notes/1
  def show
  end

  # GET /notes/new
  def new
    @note = Note.new
  end

  # GET /notes/1/edit
  def edit
  end

  # POST /notes
  def create
    @note = Note.new(note_params)

    if @note.save
      redirect_to @note, notice: "Note was successfully created."
    else
      render :new, status: :unprocessable_content
    end
  end

  # PATCH/PUT /notes/1
  def update
    if @note.update(note_params)
      redirect_to @note, notice: "Note was successfully updated.", status: :see_other
    else
      render :edit, status: :unprocessable_content
    end
  end

  # DELETE /notes/1
  def destroy
    @note.destroy!
    redirect_to notes_path, notice: "Note was successfully destroyed.", status: :see_other
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_note
      @note = Note.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def note_params
      params.expect(note: [ :title, :body ])
    end
end
